import { voiceService } from './utils/voiceGuidanceService';
import { useEffect, useState, useMemo } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { CoordHUD } from './components/CoordHUD';
import { RoomListManager } from './components/RoomListManager';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { MapControlBar } from './components/MapControlBar';
import { GoogleMapsSearchBar } from './components/GoogleMapsSearchBar';
import { GoogleMapsBottomCard } from './components/GoogleMapsBottomCard';
import { useMapStore } from './store/useMapStore';
import { startCompassListener } from './utils/compassService';
import {
  SAMPLE_FLOORS,
  SAMPLE_ROOMS,
  SAMPLE_NAV_NODES,
  SAMPLE_NAV_EDGES,
} from './data/sampleData';

function App() {
  const setRooms = useMapStore((s) => s.setRooms);
  const setNavData = useMapStore((s) => s.setNavData);
  const setBeacons = useMapStore((s) => s.setBeacons);
  const setUserPosition = useMapStore((s) => s.setUserPosition);

  const setDeviceHeading = useMapStore((s) => s.setDeviceHeading);

  useEffect(() => {
    // Khôi phục danh sách tầng đã lưu (nếu có thêm tầng từ Admin)
    try {
      const savedFloors = localStorage.getItem('inmap7a_custom_floors');
      if (savedFloors) {
        const parsed = JSON.parse(savedFloors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          useMapStore.setState({ floors: parsed, currentFloor: 1 });
        } else {
          useMapStore.setState({ floors: SAMPLE_FLOORS.filter(f => f.id === 1), currentFloor: 1 });
        }
      } else {
        useMapStore.setState({ floors: SAMPLE_FLOORS.filter(f => f.id === 1), currentFloor: 1 });
      }
    } catch {
      useMapStore.setState({ floors: SAMPLE_FLOORS.filter(f => f.id === 1), currentFloor: 1 });
    }
    
    // Khôi phục phòng đã lưu nếu admin từng sửa tên hoặc thêm phòng
    try {
      const saved = localStorage.getItem('inmap7a_custom_rooms');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRooms(parsed);
        } else {
          setRooms(SAMPLE_ROOMS);
        }
      } else {
        setRooms(SAMPLE_ROOMS);
      }
    } catch {
      setRooms(SAMPLE_ROOMS);
    }

    setNavData(SAMPLE_NAV_NODES, SAMPLE_NAV_EDGES);

    // Khôi phục danh sách Beacons đã cấu hình nếu có
    try {
      const savedBeacons = localStorage.getItem('inmap7a_custom_beacons');
      if (savedBeacons) {
        const parsed = JSON.parse(savedBeacons);
        if (Array.isArray(parsed)) {
          setBeacons(parsed);
        } else {
          setBeacons([]);
        }
      } else {
        setBeacons([]);
      }
    } catch {
      setBeacons([]);
    }
    // Không cố định vị trí ở thang máy nữa - để null chờ nhận vị trí từ Beacon/Người dùng chọn
    setUserPosition(null);

    const stopCompass = startCompassListener((heading) => {
      setDeviceHeading(heading);
    });

    // Lắng nghe sự kiện truyền từ App React Native qua WebView postMessage
    const handleNativeMessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (raw && raw.type === 'BEACON_UPDATE') {
          const currentBeacons = useMapStore.getState().beacons;
          if (raw.minor && currentBeacons.length > 0) {
            const matched = currentBeacons.find((b) => b.minor === Number(raw.minor));
            if (matched) {
              setUserPosition(matched.position);
              if (typeof matched.floor === 'number') {
                useMapStore.getState().setCurrentFloor(matched.floor);
              }
            }
          }
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener('message', handleNativeMessage);
    document.addEventListener('message', handleNativeMessage as EventListener);

    return () => {
      stopCompass();
      window.removeEventListener('message', handleNativeMessage);
      document.removeEventListener('message', handleNativeMessage as EventListener);
    };
  }, [setRooms, setNavData, setBeacons, setUserPosition, setDeviceHeading]);



  const [isAdminPath, setIsAdminPath] = useState(
    () => window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#admin')
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminPath(
        window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#admin')
      );
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  if (isAdminPath) {
    if (!isAdminAuthenticated) {
      return (
        <AdminLogin
          onSuccess={() => setIsAdminAuthenticated(true)}
          onCancel={() => {
            window.location.hash = '';
            window.history.pushState(null, '', '/');
            setIsAdminPath(false);
          }}
        />
      );
    }
    return <AdminDashboard />;
  }

  return (
    <div style={styles.appContainer}>
      <MapCanvas />

      {/* Thanh tìm kiếm trên đỉnh chuẩn Google Maps */}
      <GoogleMapsSearchBar />

      {/* Thẻ thông tin phòng phía dưới chuẩn Google Maps với nút Đường đi & Bắt đầu */}
      <GoogleMapsBottomCard />

      
      <CoordHUD />

      <RoomListManager />

      <FloatingNavActions />

      <MapControlBar />
    </div>
  );
}

function FloatingNavActions() {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);
  const rooms = useMapStore((s) => s.rooms);
  const userPosition = useMapStore((s) => s.userPosition);
  const clearNavigation = useMapStore((s) => s.clearNavigation);
  const isNavigatingActive = useMapStore((s) => s.isNavigatingActive);
  const isSimulatingWalk = useMapStore((s) => s.isSimulatingWalk);
  const startSimulationWalk = useMapStore((s) => s.startSimulationWalk);
  const stopSimulationWalk = useMapStore((s) => s.stopSimulationWalk);

  const [isVoiceMuted, setIsVoiceMuted] = useState(() => voiceService.getIsMuted());

  useEffect(() => {
    return voiceService.subscribe(setIsVoiceMuted);
  }, []);

  const navInfo = useMemo(() => {
    // Chỉ hiển thị thanh xanh hướng dẫn Turn-by-Turn khi bấm "Bắt đầu" (isNavigatingActive)
    if (!isNavigatingActive || path.length < 2) return null;
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const destNode = nodeMap.get(path[path.length - 1]);
    const startNode = nodeMap.get(path[0]);
    if (!destNode) return null;

    const fromPos = userPosition ?? startNode?.position;
    const dist = fromPos
      ? Math.hypot(destNode.position.x - fromPos.x, destNode.position.z - fromPos.z)
      : 15;
    const meters = Math.max(2, Math.round(dist * 1.2));
    const destRoom = rooms.find((r) => r.id === destNode.roomId);
    const destName = destRoom?.name ?? destNode.label ?? 'Điểm đến';

    // Xác định hướng rẽ của đoạn kế tiếp (rẽ trái / rẽ phải / đi thẳng / đích đến)
    let actionType: 'straight' | 'right' | 'left' | 'arrive' = 'straight';
    let actionText = 'Đi thẳng dọc hành lang';
    if (path.length >= 3) {
      const p1 = nodeMap.get(path[0])?.position;
      const p2 = nodeMap.get(path[1])?.position;
      const p3 = nodeMap.get(path[2])?.position;
      if (p1 && p2 && p3) {
        const v1x = p2.x - p1.x;
        const v1z = p2.z - p1.z;
        const v2x = p3.x - p2.x;
        const v2z = p3.z - p2.z;
        const cross = v1x * v2z - v1z * v2x;
        if (cross > 0.8) {
          actionType = 'right';
          actionText = 'Rẽ phải ở ngã rẽ tiếp theo';
        } else if (cross < -0.8) {
          actionType = 'left';
          actionText = 'Rẽ trái ở ngã rẽ tiếp theo';
        }
      }
    }

    if (meters <= 3) {
      actionType = 'arrive';
      actionText = 'Bạn đã tới trước cửa phòng!';
    }

    // Tìm phân đoạn trên đường đi gần vị trí người dùng nhất để tính chính xác quãng đường còn lại
    let remainingMeters = 0;
    if (fromPos && path.length >= 2) {
      // 1. Tìm node tiếp theo mà user đang hướng tới
      let closestIdx = 0;
      let minD = Infinity;
      for (let i = 0; i < path.length; i++) {
        const p = nodeMap.get(path[i])?.position;
        if (p) {
          const d = Math.hypot(p.x - fromPos.x, p.z - fromPos.z);
          if (d < minD) {
            minD = d;
            closestIdx = i;
          }
        }
      }

      // Khoảng cách từ người dùng tới node gần nhất phía trước
      const targetNextIdx = Math.min(path.length - 1, closestIdx + 1);
      const nextPos = nodeMap.get(path[targetNextIdx])?.position;
      const dToNext = nextPos ? Math.hypot(nextPos.x - fromPos.x, nextPos.z - fromPos.z) : 0;
      remainingMeters += dToNext * 1.2;

      // Cộng dồn các đoạn còn lại từ node tiếp theo tới đích
      for (let i = targetNextIdx; i < path.length - 1; i++) {
        const na = nodeMap.get(path[i]);
        const nb = nodeMap.get(path[i + 1]);
        if (na && nb) {
          remainingMeters += Math.hypot(nb.position.x - na.position.x, nb.position.z - na.position.z) * 1.2;
        }
      }
    }

    const totalMeters = Math.max(2, Math.round(remainingMeters > 0 ? remainingMeters : meters));
    const totalMinutes = Math.max(1, Math.ceil(totalMeters / 45)); // Đi bộ bình quân ~45m/phút

    // Ước tính giờ đến dự kiến (ETA)
    const now = new Date();
    const etaDate = new Date(now.getTime() + totalMinutes * 60000);
    const etaString = `${etaDate.getHours().toString().padStart(2, '0')}:${etaDate.getMinutes().toString().padStart(2, '0')}`;

    return {
      meters,
      totalMeters,
      totalMinutes,
      etaString,
      destName,
      actionType,
      actionText,
    };
  }, [isNavigatingActive, path, navNodes, rooms, userPosition]);

  useEffect(() => {
    if (!isNavigatingActive || !navInfo) {
      voiceService.stop();
      return;
    }

    if (navInfo.actionType === 'arrive') {
      voiceService.speak(`Bạn đã đến trước cửa ${navInfo.destName}!`);
    } else if (navInfo.meters <= 4) {
      voiceService.speak(`Sắp tới ${navInfo.destName}`);
    } else if (navInfo.actionType === 'right' || navInfo.actionType === 'left') {
      voiceService.speak(navInfo.actionText);
    } else {
      voiceService.speak(`${navInfo.actionText}, cách ${navInfo.meters} mét`);
    }
  }, [isNavigatingActive, navInfo]);

  if (!navInfo) return null;

  return (
    <>
      {/* 1. Thanh thông báo chỉ hướng Turn-by-Turn trên đầu - Đồng bộ 1 màu xanh nước biển phẳng hoàn toàn */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000000,
          width: 'calc(100% - 24px)',
          maxWidth: 420,
          background: '#0284c7', // Xanh Google Maps Navigation thực tế: đầm, chắc, chuẩn app bản đồ thật
          borderRadius: 18,
          color: '#ffffff',
          overflow: 'hidden',
          border: 'none',
          boxShadow: '0 8px 24px rgba(2, 132, 199, 0.25)',
          animation: 'slideDown 0.25s ease-out',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10 }}>
          {/* Icon mũi tên vector trắng trực tiếp trên nền xanh, cùng 1 màu đồng nhất */}
          <div
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {navInfo.actionType === 'straight' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="6 11 12 5 18 11" />
              </svg>
            )}
            {navInfo.actionType === 'right' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 19v-6a4 4 0 0 1 4-4h9" />
                <polyline points="15 5 19 9 15 13" />
              </svg>
            )}
            {navInfo.actionType === 'left' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 19v-6a4 4 0 0 0-4-4H6" />
                <polyline points="9 5 5 9 9 13" />
              </svg>
            )}
            {navInfo.actionType === 'arrive' && (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
              </svg>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                {navInfo.meters > 3 ? `${navInfo.meters} m` : 'Đã tới'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#e0edff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {navInfo.actionText}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#c7dcff', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Đến: <strong style={{ color: '#ffffff', fontWeight: 600 }}>{navInfo.destName}</strong>
            </div>
          </div>

          {/* Nút Bật/Tắt Giọng Nói Chỉ Đường */}
          <button
            type="button"
            onClick={() => voiceService.toggleMute()}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: isVoiceMuted ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.22)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 16,
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
            title={isVoiceMuted ? 'Bật giọng nói chỉ đường' : 'Tắt tiếng chỉ đường'}
          >
            {isVoiceMuted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>

      {/* 2. Thanh điều hướng ở dưới đáy chuẩn Google Maps: Tổng phút, khoảng cách & nút Thoát */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000000,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 12px max(14px, env(safe-area-inset-bottom, 14px))',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: 24,
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.05)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            pointerEvents: 'auto',
            animation: 'slideUp 0.25s ease-out',
          }}
        >
          {/* Thông tin thời gian & khoảng cách tổng */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.5px' }}>
                {navInfo.totalMinutes} phút
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>
                ({navInfo.totalMeters} m)
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginTop: 2 }}>
              Dự kiến đến lúc <strong style={{ color: '#0f172a' }}>{navInfo.etaString}</strong>
            </div>
          </div>

          {/* Nút Đi Thử / Tạm dừng mô phỏng & Nút Thoát */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                if (isSimulatingWalk) {
                  stopSimulationWalk();
                } else {
                  startSimulationWalk();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: isSimulatingWalk ? '#eab308' : '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: 20,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              title={isSimulatingWalk ? 'Dừng đi thử' : 'Chạy đi thử'}
            >
              <span>{isSimulatingWalk ? '⏸ Dừng' : '🚶 Đi thử'}</span>
            </button>

            {/* Nút Thoát hành trình chuẩn Google Maps */}
            <button
              type="button"
              onClick={() => {
                voiceService.stop();
                stopSimulationWalk();
                clearNavigation();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: 20,
                padding: '10px 16px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: 'none',
                transition: 'opacity 0.15s ease',
                flexShrink: 0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
};

export default App;
