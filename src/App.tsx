import { useEffect, useCallback } from 'react';
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
} from './data/sampleData';

function App() {
  const setRooms = useMapStore((s) => s.setRooms);
  const setNavData = useMapStore((s) => s.setNavData);
  const setUserPosition = useMapStore((s) => s.setUserPosition);
  const adminMode = useMapStore((s) => s.adminMode);
  const toggleAdminMode = useMapStore((s) => s.toggleAdminMode);
  const builderMode = useMapStore((s) => s.builderMode);
  const toggleBuilderMode = useMapStore((s) => s.toggleBuilderMode);
  const building3DMode = useMapStore((s) => s.building3DMode);
  const toggleBuilding3DMode = useMapStore((s) => s.toggleBuilding3DMode);

  // Nạp dữ liệu toàn bộ 3 tầng khi app khởi chạy (Tầng Trệt + Tầng 1 + Tầng 2)
  useEffect(() => {
    useMapStore.setState({ floors: SAMPLE_FLOORS });
    setRooms([...GROUND_FLOOR_ROOMS, ...SAMPLE_ROOMS, ...FLOOR_2_ROOMS]);
    setNavData(SAMPLE_NAV_NODES, SAMPLE_NAV_EDGES);
    setUserPosition({ x: 20, z: 24 });
  }, [setRooms, setNavData, setUserPosition]);

  // Phím tắt:
  // - Ctrl+Shift+A: Toggle Admin Mode
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

  const handleToggleAdmin = useCallback(() => {
    toggleAdminMode();
  }, [toggleAdminMode]);

  const handleToggleBuilder = useCallback(() => {
    toggleBuilderMode();
  }, [toggleBuilderMode]);

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

      {/* ── Nhóm nút chế độ góc trên phải ── */}
      <div style={styles.topRightControls}>
        {/* Nút Toàn Cảnh Tòa Nhà 3 Tầng */}
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

        {/* Nút 3D Room Builder */}
        <button
          onClick={handleToggleBuilder}
          style={{
            ...styles.controlBtn,
            ...(builderMode ? styles.builderToggleActive : {}),
          }}
          title="Bật/Tắt Visual 3D Room Builder (Ctrl+Shift+B)"
        >
          <span>🏗️</span>
          <span>{builderMode ? 'Dựng phòng: BẬT' : 'Dựng phòng 3D'}</span>
        </button>

        {/* Nút Admin Tool */}
        <button
          onClick={handleToggleAdmin}
          style={{
            ...styles.controlBtn,
            ...(adminMode ? styles.adminToggleActive : {}),
          }}
          title="Bật/Tắt Admin Tool — Click lấy tọa độ (Ctrl+Shift+A)"
        >
          <span>{adminMode ? '📐' : '🔧'}</span>
          <span>{adminMode ? 'Admin: BẬT' : 'Lấy tọa độ'}</span>
        </button>
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
