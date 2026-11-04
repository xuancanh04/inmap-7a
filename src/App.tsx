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
  const toggleAdminMode = useMapStore((s) => s.toggleAdminMode);
  const toggleBuilderMode = useMapStore((s) => s.toggleBuilderMode);

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

    // Kết nối Webhook Server (SSE) để tự động nhận vị trí từ App React Native
    let eventSource: EventSource | null = null;
    try {
      const serverPort = 3001;
      const sseUrl = `http://${window.location.hostname || 'localhost'}:${serverPort}/api/events`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.userPosition) {
            // Nhận tọa độ trực tiếp từ Mobile
            setUserPosition({ x: data.userPosition.x, z: data.userPosition.z });
            if (typeof data.userPosition.floor === 'number') {
              useMapStore.getState().setCurrentFloor(data.userPosition.floor);
            }
          } else if (data && Array.isArray(data.beacons)) {
            // Nhận danh sách beacon quét được từ Mobile để tự tính tọa độ
            const currentBeacons = useMapStore.getState().beacons;
            if (currentBeacons.length > 0 && data.beacons.length > 0) {
              const matched = currentBeacons.find((b) => b.minor === data.beacons[0]?.minor);
              if (matched) {
                setUserPosition(matched.position);
              }
            }
          }
        } catch {
          // ignore
        }
      };

      eventSource.onerror = () => {
        // Server webhook chưa chạy hoặc ngắt kết nối
      };
    } catch {
      // ignore
    }

    return () => {
      stopCompass();
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [setRooms, setNavData, setBeacons, setUserPosition, setDeviceHeading]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleAdminMode();
      }
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        toggleBuilderMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAdminMode, toggleBuilderMode]);

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

  if (!navInfo) return null;

  return (
    <>
      {/* 1. Thanh thông báo chỉ hướng Turn-by-Turn trên đầu - Đồng bộ 1 màu xanh nước biển phẳng hoàn toàn */}
      <div
        style={{
          position: 'absolute',
          top: 'max(14px, env(safe-area-inset-top, 14px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000000,
          width: 'calc(100% - 24px)',
          maxWidth: 420,
          background: '#0d65d9', // Xanh Google Maps Navigation thực tế: đầm, chắc, chuẩn app bản đồ thật
          borderRadius: 16,
          color: '#ffffff',
          overflow: 'hidden',
          border: 'none',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
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
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            borderRadius: 24,
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.12)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
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
              <span style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', letterSpacing: '-0.5px' }}>
                {navInfo.totalMinutes} phút
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                ({navInfo.totalMeters} m)
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 500, marginTop: 2 }}>
              Dự kiến đến lúc <strong style={{ color: '#f8fafc' }}>{navInfo.etaString}</strong>
            </div>
          </div>

          {/* Nút Thoát hành trình chuẩn Google Maps */}
          <button
            type="button"
            onClick={clearNavigation}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: 20,
              padding: '10px 18px',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'opacity 0.15s ease',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Thoát</span>
          </button>
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
  topRightControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    zIndex: 100,
  },
  controlBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    background: 'rgba(15,15,26,0.85)',
    backdropFilter: 'blur(12px)',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  buildingToggleActive: {
    border: '1px solid rgba(56, 189, 248, 0.6)',
    background: 'rgba(56, 189, 248, 0.18)',
    color: '#38bdf8',
    boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3)',
  },
  builderToggleActive: {
    border: '1px solid rgba(0, 242, 254, 0.5)',
    background: 'rgba(0, 242, 254, 0.15)',
    color: '#00f2fe',
    boxShadow: '0 4px 20px rgba(0, 242, 254, 0.25)',
  },
  adminToggleActive: {
    border: '1px solid rgba(255,107,107,0.4)',
    background: 'rgba(255,107,107,0.12)',
    color: '#ff6b6b',
    boxShadow: '0 4px 20px rgba(255,107,107,0.15)',
  },
};

export default App;
