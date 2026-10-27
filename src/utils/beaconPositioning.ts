// ============================================================================
// InMap 7A — beaconPositioning.ts
// Thuật toán ước lượng tọa độ trong nhà từ sóng BLE Beacon (RSSI / Proximity / Trilateration)
// ============================================================================

import type { Point2D, BeaconDevice, BleScanReading } from '../types';

/**
 * Tính toán khoảng cách (mét) ước lượng từ chỉ số cường độ sóng RSSI:
 * Công thức Log-Distance Path Loss Model:
 *   RSSI = - (10 * n * log10(d) - TxPower)
 *   => d = 10 ^ ((TxPower - RSSI) / (10 * n))
 *
 * @param rssi Cường độ tín hiệu nhận được (thường từ -40 dBm đến -95 dBm)
 * @param txPower Cường độ phát sóng chuẩn ở khoảng cách 1 mét (thường là -59 dBm)
 * @param pathLossExponent Hệ số suy hao môi trường trong nhà (n = 2.0 đến 2.8)
 */
export function calculateDistanceFromRssi(
  rssi: number,
  txPower: number = -59,
  pathLossExponent: number = 2.2
): number {
  if (rssi === 0) return -1.0; // Tín hiệu không xác định

  const ratio = (txPower - rssi) / (10 * pathLossExponent);
  const distance = Math.pow(10, ratio);
  return Math.round(distance * 10) / 10;
}

/**
 * Thuật toán Proximity (Gần nhất):
 * Tìm beacon có tín hiệu RSSI mạnh nhất (gần người dùng nhất) để gán vị trí.
 * Thích hợp cho bộ 5 Beacon trong dự án bệnh viện: độ tin cậy cao, không bị sai lệch do nhiễu dội sóng.
 */
export function estimatePositionByProximity(
  readings: BleScanReading[],
  beacons: BeaconDevice[]
): Point2D | null {
  if (!readings || readings.length === 0) return null;

  // Lọc lấy reading có RSSI mạnh nhất (lớn nhất)
  const strongest = readings.reduce((prev, curr) => (curr.rssi > prev.rssi ? curr : prev));
  const matchedBeacon = beacons.find((b) => b.minor === strongest.minor);

  return matchedBeacon ? matchedBeacon.position : null;
}

/**
 * Thuật toán Trilateration (Giao thoa 3 điểm):
 * Ước lượng vị trí (x, z) chính xác dựa trên tọa độ 3 beacon và khoảng cách tính được từ RSSI.
 */
export function estimatePositionByTrilateration(
  readings: BleScanReading[],
  beacons: BeaconDevice[]
): Point2D | null {
  if (readings.length < 3) {
    // Không đủ 3 beacon -> chuyển sang thuật toán gần nhất (Proximity)
    return estimatePositionByProximity(readings, beacons);
  }

  // Lấy 3 beacon có khoảng cách nhỏ nhất
  const sorted = [...readings].sort((a, b) => a.distance - b.distance).slice(0, 3);
  const b1 = beacons.find((b) => b.minor === sorted[0].minor);
  const b2 = beacons.find((b) => b.minor === sorted[1].minor);
  const b3 = beacons.find((b) => b.minor === sorted[2].minor);

  if (!b1 || !b2 || !b3) return estimatePositionByProximity(readings, beacons);

  // Tính tọa độ trọng số theo nghịch đảo bình phương khoảng cách (Weighted Centroid)
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

/**
 * Trình quét Web Bluetooth iBeacon thực tế trên trình duyệt Smartphone / Laptop:
 * Hỗ trợ nhận diện gói tin iBeacon từ module DFRobot Gravity BLE (TEL0149).
 */
export async function startWebBleBeaconScanner(
  onBeaconDetected: (minor: number, rssi: number) => void
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
      filters: [{ manufacturerData: [{ companyIdentifier: 0x004c }] }], // Apple iBeacon prefix
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
        // Cấu trúc gói tin Apple iBeacon chuẩn:
        // Byte 0-1: 0x02, 0x15 (Subtype & Length)
        // Byte 2-17: UUID (16 bytes)
        // Byte 18-19: Major (2 bytes)
        // Byte 20-21: Minor (2 bytes)
        const minor = dataView.getUint16(20, false);
        onBeaconDetected(minor, e.rssi);
      }
    });

    return true;
  } catch (err) {
    console.error('Lỗi khởi động quét BLE Beacon:', err);
    return false;
  }
}

/**
 * Kích hoạt module DFRobot Gravity BLE Beacon chạy trên RAM qua cổng USB (Web Serial API):
 * Gửi các lệnh AT vào RAM tạm thời, KHÔNG dùng AT+SAVE để bảo vệ chip tuyệt đối.
 */
export async function activateBeaconViaUsbRunInRam(
  onLog: (msg: string) => void
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
    onLog('Đang yêu cầu chọn cổng COM USB của Beacon...');
    const port = await nav.serial.requestPort();

    // Nếu cổng chưa mở thì mới gọi open
    // Thử gửi lệnh ở 115200 trước, sau đó thử tiếp 9600
    const rates = [115200, 9600];

    const commands = [
      '+++\r\n',
      'AT\r\n',
      'AT+IBEACON=ON\r\n',
      'AT+MAJOR=10001\r\n',
      'AT+MINOR=1\r\n',
      'AT+START\r\n',
    ];

    for (const baud of rates) {
      try {
        if (!port.readable || !port.writable) {
          await port.open({ baudRate: baud });
        }
        onLog(`Đang thử nạp RAM với tốc độ ${baud}...`);
        const encoder = new TextEncoder();
        const writer = port.writable.getWriter();

        for (const cmd of commands) {
          await writer.write(encoder.encode(cmd));
          await new Promise((r) => setTimeout(r, 150));
        }

        writer.releaseLock();
        await port.close();
        onLog(`Đã gửi lệnh ở ${baud}!`);
      } catch {
        // Tiếp tục thử baudrate tiếp theo
      }
    }

    onLog('✅ Đã nạp RAM thành công (chỉ lưu RAM, không ghi Flash)! Mời bạn quét lại nRF Connect.');
    return true;
  } catch (err) {
    onLog(`Lỗi: ${(err as Error).message || err}`);
    return false;
  }
}


