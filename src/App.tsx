import { useEffect, useState, useMemo } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { UIPanel } from './components/UIPanel';
import { CoordHUD } from './components/CoordHUD';
import { RoomListManager } from './components/RoomListManager';
import { AdminDashboard } from './components/AdminDashboard';
import { MapControlBar } from './components/MapControlBar';
import { useMapStore } from './store/useMapStore';
import {
  SAMPLE_FLOORS,
  SAMPLE_ROOMS,
  GROUND_FLOOR_ROOMS,
  FLOOR_2_ROOMS,
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

  useEffect(() => {
    useMapStore.setState({ floors: SAMPLE_FLOORS });
    setRooms([...GROUND_FLOOR_ROOMS, ...SAMPLE_ROOMS, ...FLOOR_2_ROOMS]);
    setNavData(SAMPLE_NAV_NODES, SAMPLE_NAV_EDGES);

    setBeacons([]);
    setUserPosition({ x: 20, z: 24 });
  }, [setRooms, setNavData, setBeacons, setUserPosition]);

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
    return <AdminDashboard />;
  }

  return (
    <div style={styles.appContainer}>
      <MapCanvas />

      <UIPanel />

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
  const userPosition = useMapStore((s) => s.userPosition);
  const isFollowingUser = useMapStore((s) => s.isFollowingUser);

  const remainingMeters = useMemo(() => {
    if (path.length < 2 || !userPosition) return 0;
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const destNode = nodeMap.get(path[path.length - 1]);
    if (!destNode) return 0;
    const dist = Math.hypot(destNode.position.x - userPosition.x, destNode.position.z - userPosition.z);
    return Math.round(dist * 1.2);
  }, [path, navNodes, userPosition]);

  if (path.length < 2) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        maxWidth: '92vw',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: 24,
          boxShadow: '0 8px 30px rgba(30, 58, 138, 0.5)',
          border: '1px solid rgba(147, 197, 253, 0.4)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <span style={{ fontSize: 20 }}>⬆️</span>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            {remainingMeters > 3 ? `Còn khoảng ${remainingMeters}m nữa tới nơi` : '🎉 Bạn đã đến trước cửa phòng!'}
          </span>
          <span style={{ fontSize: 11, color: '#bfdbfe' }}>
            {isFollowingUser ? '🟢 Đang tự động đi theo bước chân bạn' : 'Đi dọc hành lang theo vạch xanh'}
          </span>
        </div>
      </div>

    </div>
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
