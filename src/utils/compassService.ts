let isListening = false;
let permissionRequested = false;

export async function requestDeviceOrientationPermission(): Promise<boolean> {
  const DeviceOrient = (typeof window !== 'undefined' ? window.DeviceOrientationEvent : undefined) as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };

  if (typeof DeviceOrient?.requestPermission === 'function') {
    try {
      const permissionState = await DeviceOrient.requestPermission();
      permissionRequested = true;
      return permissionState === 'granted';
    } catch (err) {
      console.warn('Lỗi xin quyền cảm biến xoay:', err);
      return false;
    }
  }

  permissionRequested = true;
  return true;
}

export function startCompassListener(onHeadingChange: (heading: number) => void): () => void {
  // Tự động xin quyền / kích hoạt ngay lần chạm đầu tiên vào màn hình
  const autoRequestOnTouch = async () => {
    if (!permissionRequested) {
      await requestDeviceOrientationPermission();
    }
    window.removeEventListener('touchstart', autoRequestOnTouch, true);
    window.removeEventListener('click', autoRequestOnTouch, true);
  };

  window.addEventListener('touchstart', autoRequestOnTouch, true);
  window.addEventListener('click', autoRequestOnTouch, true);

  if (isListening) return () => {};
  isListening = true;

  const handleOrientation = (e: DeviceOrientationEvent) => {
    const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (typeof webkitHeading === 'number' && !isNaN(webkitHeading)) {
      onHeadingChange(Math.round(webkitHeading));
      return;
    }

    if (e.alpha !== null && !isNaN(e.alpha)) {
      const heading = (360 - e.alpha) % 360;
      onHeadingChange(Math.round(heading));
    }
  };

  window.addEventListener('deviceorientation', handleOrientation, true);
  window.addEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);

  return () => {
    isListening = false;
    window.removeEventListener('touchstart', autoRequestOnTouch, true);
    window.removeEventListener('click', autoRequestOnTouch, true);
    window.removeEventListener('deviceorientation', handleOrientation, true);
    window.removeEventListener('deviceorientationabsolute' as unknown as keyof WindowEventMap, handleOrientation as EventListener, true);
  };
}
