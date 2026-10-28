import { useMapStore } from '../store/useMapStore';
import type { Point2D } from '../types';

let isTracking = false;
let lastAccelMagnitude = 0;
let lastStepTime = 0;
const STEP_THRESHOLD = 11.2;
const MIN_STEP_INTERVAL = 320;
const AVERAGE_STEP_LENGTH = 0.65;

export function isDeviceTrackingActive(): boolean {
  return isTracking;
}

export async function startRealWalkTracking(onStatusUpdate?: (msg: string) => void): Promise<boolean> {
  if (isTracking) return true;

  if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> })?.requestPermission === 'function') {
    try {
      const motionEventClass = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      const motionPerm = motionEventClass.requestPermission ? await motionEventClass.requestPermission() : 'granted';
      if (motionPerm !== 'granted') {
        onStatusUpdate?.('⚠️ Chưa cấp quyền cảm biến chuyển động trên iPhone');
        return false;
      }
    } catch (e) {
      onStatusUpdate?.(`Lỗi cấp quyền: ${(e as Error).message}`);
      return false;
    }
  }

  if (typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })?.requestPermission === 'function') {
    try {
      const orientEventClass = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (orientEventClass.requestPermission) {
        await orientEventClass.requestPermission();
      }
    } catch (permErr) {
      console.warn(permErr);
    }
  }

  isTracking = true;
  onStatusUpdate?.('🟢 Đang theo dõi bước đi & hướng nhìn thực tế!');

  const handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha !== null) {

      const heading = (360 - e.alpha) % 360;
      useMapStore.getState().setDeviceHeading(heading);
    }
  };
  window.addEventListener('deviceorientation', handleOrientation);

  const handleMotion = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const mag = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    const now = Date.now();

    if (mag > STEP_THRESHOLD && lastAccelMagnitude <= STEP_THRESHOLD && now - lastStepTime > MIN_STEP_INTERVAL) {
      lastStepTime = now;
      handleStepDetected();
    }
    lastAccelMagnitude = mag;
  };
  window.addEventListener('devicemotion', handleMotion);

  return true;
}

function handleStepDetected() {
  const state = useMapStore.getState();
  const currentPos = state.userPosition;
  const path = state.navigation.path;
  const navNodes = state.navNodes;

  if (!currentPos) return;

  if (path.length >= 2) {
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const waypoints = path.map((id) => nodeMap.get(id)?.position).filter(Boolean) as Point2D[];

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

    const newX = currentPos.x + (segDx / segLen) * AVERAGE_STEP_LENGTH;
    const newZ = currentPos.z + (segDz / segLen) * AVERAGE_STEP_LENGTH;

    useMapStore.setState({
      userPosition: { x: newX, z: newZ },
    });
  } else {

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

export function stopRealWalkTracking() {
  isTracking = false;
}
