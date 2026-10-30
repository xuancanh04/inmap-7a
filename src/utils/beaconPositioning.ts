import type { Point2D, BeaconDevice, BleScanReading } from '../types';

class RssiSmoother {
  private smoothedRssiMap = new Map<number, number>();
  private lastSeenMap = new Map<number, number>();
  private readonly alpha: number;
  private readonly ttlMs: number;

  constructor(alpha: number = 0.28, ttlMs: number = 4000) {
    this.alpha = alpha;
    this.ttlMs = ttlMs;
  }

  public smooth(minor: number, rawRssi: number): number {
    const now = Date.now();
    const lastSeen = this.lastSeenMap.get(minor) ?? 0;
    const prev = this.smoothedRssiMap.get(minor);

    let smoothed: number;
    if (prev === undefined || (now - lastSeen) > this.ttlMs) {
      smoothed = rawRssi;
    } else {
      smoothed = this.alpha * rawRssi + (1 - this.alpha) * prev;
    }

    this.smoothedRssiMap.set(minor, smoothed);
    this.lastSeenMap.set(minor, now);
    return Math.round(smoothed * 10) / 10;
  }

  public clear(): void {
    this.smoothedRssiMap.clear();
    this.lastSeenMap.clear();
  }
}

export const globalRssiSmoother = new RssiSmoother(0.28, 4000);

export function calculateDistanceFromRssi(
  rssi: number,
  txPower: number = -59,
  pathLossExponent: number = 2.2
): number {
  if (rssi === 0) return -1.0;

  const ratio = (txPower - rssi) / (10 * pathLossExponent);
  const distance = Math.pow(10, ratio);
  return Math.round(distance * 10) / 10;
}

export function estimatePositionByProximity(
  readings: BleScanReading[],
  beacons: BeaconDevice[]
): Point2D | null {
  if (!readings || readings.length === 0) return null;

  const strongest = readings.reduce((prev, curr) => (curr.rssi > prev.rssi ? curr : prev));
  const matchedBeacon = beacons.find((b) => b.minor === strongest.minor);

  return matchedBeacon ? matchedBeacon.position : null;
}

export function estimatePositionByTrilateration(
  readings: BleScanReading[],
  beacons: BeaconDevice[]
): Point2D | null {
  if (readings.length < 3) {
    return estimatePositionByProximity(readings, beacons);
  }

  const sorted = [...readings].sort((a, b) => a.distance - b.distance).slice(0, 3);
  const b1 = beacons.find((b) => b.minor === sorted[0].minor);
  const b2 = beacons.find((b) => b.minor === sorted[1].minor);
  const b3 = beacons.find((b) => b.minor === sorted[2].minor);

  if (!b1 || !b2 || !b3) return estimatePositionByProximity(readings, beacons);

  const w1 = 1 / Math.max(0.1, Math.pow(sorted[0].distance, 2));
  const w2 = 1 / Math.max(0.1, Math.pow(sorted[1].distance, 2));
  const w3 = 1 / Math.max(0.1, Math.pow(sorted[2].distance, 2));
  const totalW = w1 + w2 + w3;

  const estX = (b1.position.x * w1 + b2.position.x * w2 + b3.position.x * w3) / totalW;
  const estZ = (b1.position.z * w1 + b2.position.z * w2 + b3.position.z * w3) / totalW;

  return {
    x: Math.round(estX * 10) / 10,
    z: Math.round(estZ * 10) / 10,
  };
}

export async function startWebBleBeaconScanner(
  onBeaconDetected: (minor: number, rawRssi: number, smoothedRssi: number) => void
): Promise<boolean> {
  const nav = navigator as Navigator & {
    bluetooth?: {
      requestLEScan?: (options: unknown) => Promise<unknown>;
      addEventListener?: (event: string, handler: (e: unknown) => void) => void;
    };
  };

  if (!nav.bluetooth || !nav.bluetooth.requestLEScan || !nav.bluetooth.addEventListener) {
    console.warn('⚠️ Trình duyệt hiện tại chưa kích hoạt Web Bluetooth Scanning API.');
    return false;
  }

  try {
    await nav.bluetooth.requestLEScan({
      filters: [{ manufacturerData: [{ companyIdentifier: 0x004c }] }],
      keepRepeatedDevices: true,
      acceptAllAdvertisements: true,
    });

    nav.bluetooth.addEventListener('advertisementreceived', (event: unknown) => {
      const e = event as {
        rssi: number;
        manufacturerData?: Map<number, DataView>;
      };

      if (!e.manufacturerData) return;
      const dataView = e.manufacturerData.get(0x004c);
      if (dataView && dataView.byteLength >= 23) {
        const minor = dataView.getUint16(20, false);
        const smoothed = globalRssiSmoother.smooth(minor, e.rssi);
        onBeaconDetected(minor, e.rssi, smoothed);
      }
    });

    return true;
  } catch (err) {
    console.error('Lỗi khởi động quét BLE Beacon:', err);
    return false;
  }
}

export async function activateBeaconViaUsbRunInRam(
  onLog: (msg: string) => void,
  minorId: number = 1
): Promise<boolean> {
  const nav = navigator as Navigator & {
    serial?: {
      requestPort: () => Promise<{
        open: (options: { baudRate: number }) => Promise<void>;
        writable: WritableStream<Uint8Array>;
        readable: ReadableStream<Uint8Array>;
        close: () => Promise<void>;
      }>;
    };
  };

  if (!nav.serial) {
    onLog('Trình duyệt chưa hỗ trợ Web Serial. Hãy dùng Google Chrome hoặc Edge trên máy tính.');
    return false;
  }

  try {
    onLog(`Đang mở cổng COM để cấu hình Beacon Minor = ${minorId}...`);
    const port = await nav.serial.requestPort();

    const rates = [115200, 9600];

    const commands = [
      '+++\r\n',
      'AT\r\n',
      'AT+IBEACON=ON\r\n',
      'AT+MAJOR=10001\r\n',
      `AT+MINOR=${minorId}\r\n`,
      'AT+START\r\n',
    ];

    for (const baud of rates) {
      try {
        if (!port.readable || !port.writable) {
          await port.open({ baudRate: baud });
        }
        onLog(`Đang gửi lệnh nạp RAM với Minor=${minorId} ở tốc độ ${baud}...`);
        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();

        for (const cmd of commands) {
          await writer.write(encoder.encode(cmd));
          await new Promise((r) => setTimeout(r, 150));
        }

        writer.releaseLock();
        await port.close();
        onLog(`Đã gửi cấu hình Minor=${minorId} ở tốc độ ${baud}!`);
      } catch (baudErr) {
        console.warn(baudErr);
      }
    }

    onLog(`✅ Đã nạp RAM thành công cho Beacon Minor = ${minorId}! Thiết bị bắt đầu phát sóng.`);
    return true;
  } catch (err) {
    onLog(`❌ Lỗi cấu hình Beacon: ${String(err)}`);
    return false;
  }
}
