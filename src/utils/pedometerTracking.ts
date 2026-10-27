// ============================================================================
// InMap 7A — pedometerTracking.ts
// Bộ nhận diện bước chân (Dead Reckoning & Step Detection) từ cảm biến điện thoại
// Kết hợp la bàn và gia tốc kế để di chuyển bản đồ theo bước chân ngoài đời
// ============================================================================

import { useMapStore } from '../store/useMapStore';
import type { Point2D } from '../types';

let isTracking = false;
let lastAccelMagnitude = 0;
let lastStepTime = 0;
const STEP_THRESHOLD = 11.2; // Ngưỡng nhận diện nhịp bước chân người đi bộ (m/s^2)
const MIN_STEP_INTERVAL = 320; // Tối thiểu 320ms giữa 2 bước chân tránh rung lắc ảo
const AVERAGE_STEP_LENGTH = 0.65; // Chiều dài bước chân trung bình khoảng 0.65 mét

export function isDeviceTrackingActive(): boolean {
  return isTracking;
}

/**
 * Bắt đầu theo dõi bước chân và hướng đi từ cảm biến điện thoại thực tế
 */
export async function startRealWalkTracking(onStatusUpdate?: (msg: string) => void): Promise<boolean> {
  if (isTracking) return true;

  // 1. Xin quyền cảm biến trên iOS 13+ (iPhone)
  if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
    try {
      const motionPerm = await (DeviceMotionEvent as any).requestPermission();
      if (motionPerm !== 'granted') {
        onStatusUpdate?.('⚠️ Chưa cấp quyền cảm biến chuyển động trên iPhone');
        return false;
      }
    } catch (e) {
      onStatusUpdate?.(`Lỗi cấp quyền: ${(e as Error).message}`);
      return false;
    }
  }

  if (typeof (DeviceOrientationEvent as any)?.requestPermission === 'function') {
    try {
      await (DeviceOrientationEvent as any).requestPermission();
    } catch {
      // ignore
    }
  }

  isTracking = true;
  onStatusUpdate?.('🟢 Đang theo dõi bước đi & hướng nhìn thực tế!');

  // 2. Lắng nghe cảm biến la bàn xoay hướng (Orientation)
  const handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha !== null) {
      // Trên iOS/Android, góc la bàn chuẩn (0 = Bắc, 90 = Đông, 180 = Nam, 270 = Tây)
      const heading = (360 - e.alpha) % 360;
      useMapStore.getState().setDeviceHeading(heading);
    }
  };
  window.addEventListener('deviceorientation', handleOrientation);

  // 3. Lắng nghe cảm biến gia tốc để đếm bước chân đi bộ ngoài đời (Motion)
  const handleMotion = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    // Tính độ lớn gia tốc tổng hợp: sqrt(x^2 + y^2 + z^2)
    const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();

    // Phát hiện đỉnh bước chân khi bạn bước đi
    if (mag > STEP_THRESHOLD && lastAccelMagnitude <= STEP_THRESHOLD && now - lastStepTime > MIN_STEP_INTERVAL) {
      lastStepTime = now;
      handleStepDetected();
    }
    lastAccelMagnitude = mag;
  };
  window.addEventListener('devicemotion', handleMotion);

  return true;
}

/**
 * Xử lý khi người dùng bước 1 bước chân thực tế ngoài đời
 */
function handleStepDetected() {
  const state = useMapStore.getState();
  const currentPos = state.userPosition;
  const path = state.navigation.path;
  const navNodes = state.navNodes;

  if (!currentPos) return;

  // Nếu đang có lộ trình dẫn đường: Người dùng bước đi sẽ bám theo lộ trình hành lang
  if (path.length >= 2) {
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const waypoints = path.map((id) => nodeMap.get(id)?.position).filter(Boolean) as Point2D[];

    // Tìm đoạn đường gần người dùng nhất
    let bestDist = Infinity;
    let segIdx = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      if (dist < bestDist) {
        bestDist = dist;
        segIdx = i;
      }
    }

    const currP1 = waypoints[segIdx];
    const currP2 = waypoints[Math.min(segIdx + 1, waypoints.length - 1)];
    const segDx = currP2.x - currP1.x;
    const segDz = currP2.z - currP1.z;
    const segLen = Math.hypot(segDx, segDz) || 1;

    // Tiến thêm 1 bước chân (AVERAGE_STEP_LENGTH) dọc theo hành lang dẫn đường
    const newX = currentPos.x + (segDx / segLen) * AVERAGE_STEP_LENGTH;
    const newZ = currentPos.z + (segDz / segLen) * AVERAGE_STEP_LENGTH;

    useMapStore.setState({
      userPosition: { x: newX, z: newZ },
    });
  } else {
    // Nếu đi tự do (không chọn phòng): tiến về phía trước theo góc la bàn
    const heading = state.deviceHeading ?? 0;
    const rad = (heading * Math.PI) / 180;
    const dx = Math.sin(rad) * AVERAGE_STEP_LENGTH;
    const dz = Math.cos(rad) * AVERAGE_STEP_LENGTH;

    useMapStore.setState({
      userPosition: {
        x: currentPos.x + dx,
        z: currentPos.z + dz,
      },
    });
  }
}

/**
 * Dừng theo dõi
 */
export function stopRealWalkTracking() {
  isTracking = false;
}
