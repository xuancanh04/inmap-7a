import { useEffect, useState, useMemo } from 'react';
import { MapCanvas } from './components/MapCanvas';
import { UIPanel } from './components/UIPanel';
import { CoordHUD } from './components/CoordHUD';
import { RoomListManager } from './components/RoomListManager';
import { useMapStore } from './store/useMapStore';
import {
  SAMPLE_FLOORS,
  SAMPLE_ROOMS,
  GROUND_FLOOR_ROOMS,
  FLOOR_2_ROOMS,
  SAMPLE_NAV_NODES,
  SAMPLE_NAV_EDGES,
  SAMPLE_BEACONS,
} from './data/sampleData';

function App() {
  const setRooms = useMapStore((s) => s.setRooms);
  const setNavData = useMapStore((s) => s.setNavData);
  const setBeacons = useMapStore((s) => s.setBeacons);
  const setUserPosition = useMapStore((s) => s.setUserPosition);
  const toggleAdminMode = useMapStore((s) => s.toggleAdminMode);
  const toggleBuilderMode = useMapStore((s) => s.toggleBuilderMode);
  const building3DMode = useMapStore((s) => s.building3DMode);
  const toggleBuilding3DMode = useMapStore((s) => s.toggleBuilding3DMode);

  // Nạp dữ liệu toàn bộ 3 tầng khi app khởi chạy (Tầng Trệt + Tầng 1 + Tầng 2)
  useEffect(() => {
    useMapStore.setState({ floors: SAMPLE_FLOORS });
    setRooms([...GROUND_FLOOR_ROOMS, ...SAMPLE_ROOMS, ...FLOOR_2_ROOMS]);
    setNavData(SAMPLE_NAV_NODES, SAMPLE_NAV_EDGES);
    setBeacons(SAMPLE_BEACONS);
    setUserPosition({ x: 20, z: 24 });
  }, [setRooms, setNavData, setBeacons, setUserPosition]);

  // Phím tắt dành cho quản trị / kỹ thuật:
  // - Ctrl+Shift+A: Toggle Admin HUD Tọa độ
  // - Ctrl+Shift+B: Toggle 3D Room Builder
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

  return (
    <div style={styles.appContainer}>
      {/* ── Canvas 3D chiếm toàn màn hình ── */}
      <MapCanvas />

      {/* ── Panel điều khiển overlay ── */}
      <UIPanel />

      {/* ── Admin Tool: HUD tọa độ ── */}
      <CoordHUD />

      {/* ── Bảng quản lý phòng & Batch 3D Extruder + Export JSON ── */}
      <RoomListManager />

      {/* ── Nút chế độ góc trên phải: Xem toàn cảnh tòa nhà 3 tầng ── */}
      <div className="top-right-mobile" style={styles.topRightControls}>
        <button
          onClick={toggleBuilding3DMode}
          style={{
            ...styles.controlBtn,
            ...(building3DMode ? styles.buildingToggleActive : {}),
          }}
          title="Bật/Tắt chế độ Toàn cảnh tòa nhà 3 tầng ghép lại (3D Stack)"
        >
          <span>🏢</span>
          <span>{building3DMode ? 'Toàn nhà 3D: BẬT' : 'Xem 1 tầng'}</span>
        </button>
      </div>

      {/* ── Thanh điều khiển Dẫn đường Nổi (Floating Bar) hiển thị ngay khi có lộ trình ── */}
      <FloatingNavActions />
    </div>
  );
}

/**
 * Component thanh điều khiển nổi bật ngay trên màn hình khi đang tìm đường
 */
/**
 * Component thanh điều khiển nổi bật ngay trên màn hình khi đang tìm đường
 * Chuẩn Google Maps:
 * - Hiển thị khoảng cách còn lại (mét)
 * - Nút "Định vị bước đi thật" (kích hoạt đếm bước chân bằng gia tốc kế + la bàn số)
 * - Nút "Mô phỏng" (tự động bước đi)
 */
function FloatingNavActions() {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);
  const userPosition = useMapStore((s) => s.userPosition);
  const isSimulatingWalk = useMapStore((s) => s.isSimulatingWalk);
  const startSimulationWalk = useMapStore((s) => s.startSimulationWalk);
  const stopSimulationWalk = useMapStore((s) => s.stopSimulationWalk);
  const [isRealTracking, setIsRealTracking] = useState(false);
  const [trackingMsg, setTrackingMsg] = useState('');

  // Tính khoảng cách còn lại tới đích (mét)
  const remainingMeters = useMemo(() => {
    if (path.length < 2 || !userPosition) return 0;
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const destNode = nodeMap.get(path[path.length - 1]);
    if (!destNode) return 0;
    const dist = Math.hypot(destNode.position.x - userPosition.x, destNode.position.z - userPosition.z);
    return Math.round(dist * 1.2); // Quy đổi tọa độ sang mét thực tế
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
        gap: 6,
        maxWidth: '92vw',
      }}
    >
      {/* Banner chỉ đường xanh Google Maps */}
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
            {isRealTracking ? '🟢 Đang định vị bước chân & la bàn thật' : 'Đi dọc hành lang theo vạch xanh'}
          </span>
        </div>
      </div>

      {/* Thanh nút bấm điều khiển */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          background: 'rgba(15, 23, 42, 0.92)',
          padding: '6px 12px',
          borderRadius: 25,
          border: '1px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Nút bật cảm biến bước đi thật ngoài đời */}
        <button
          type="button"
          onClick={async () => {
            const { startRealWalkTracking, stopRealWalkTracking } = await import('./utils/pedometerTracking');
            if (isRealTracking) {
              stopRealWalkTracking();
              setIsRealTracking(false);
              setTrackingMsg('');
            } else {
              const ok = await startRealWalkTracking((msg) => setTrackingMsg(msg));
              if (ok) setIsRealTracking(true);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: isRealTracking
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'rgba(56, 189, 248, 0.18)',
            color: isRealTracking ? '#ffffff' : '#38bdf8',
            border: isRealTracking ? 'none' : '1px solid rgba(56, 189, 248, 0.4)',
            padding: '7px 14px',
            borderRadius: 18,
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <span>{isRealTracking ? '🟢 Đang đo bước thật' : '🚶 Bật đi thật'}</span>
        </button>

        {/* Nút mô phỏng tự động */}
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
            background: isSimulatingWalk ? '#ef4444' : 'rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            border: 'none',
            padding: '7px 14px',
            borderRadius: 18,
            fontWeight: 600,
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <span>{isSimulatingWalk ? '⏸ Dừng' : '▶ Đi thử'}</span>
        </button>
      </div>

      {trackingMsg && (
        <div style={{ fontSize: 11, color: '#38bdf8', background: 'rgba(0,0,0,0.7)', padding: '3px 10px', borderRadius: 12 }}>
          {trackingMsg}
        </div>
      )}
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
