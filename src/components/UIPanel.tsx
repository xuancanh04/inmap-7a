// ============================================================================
// InMap 7A — UIPanel.tsx
// Bảng điều khiển UI: Chọn tầng, Chọn phòng, Dẫn đường
// ============================================================================

import { useCallback, useMemo } from 'react';
import { useMapStore } from '../store/useMapStore';

/**
 * Panel điều khiển UI overlay trên canvas 3D.
 * - Chọn tầng
 * - Chọn phòng xuất phát / đích
 * - Nút dẫn đường / xóa đường
 */
export function UIPanel() {
  const floors = useMapStore((s) => s.floors);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const rooms = useMapStore((s) => s.rooms);
  const navNodes = useMapStore((s) => s.navNodes);
  const navigation = useMapStore((s) => s.navigation);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);
  const setOrigin = useMapStore((s) => s.setOrigin);
  const setDestination = useMapStore((s) => s.setDestination);
  const calculatePath = useMapStore((s) => s.calculatePath);
  const clearNavigation = useMapStore((s) => s.clearNavigation);

  // Lọc phòng & node theo tầng hiện tại
  const floorRooms = useMemo(
    () => rooms.filter((r) => r.floor === currentFloor),
    [rooms, currentFloor]
  );

  // Nodes liên kết với phòng (có roomId) trên tầng hiện tại
  const roomNodes = useMemo(
    () => navNodes.filter((n) => n.floor === currentFloor && n.roomId),
    [navNodes, currentFloor]
  );

  const handleOriginChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setOrigin(value || null);
    },
    [setOrigin]
  );

  const handleDestChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setDestination(value || null);
    },
    [setDestination]
  );

  const handleNavigate = useCallback(() => {
    calculatePath();
  }, [calculatePath]);

  const handleClear = useCallback(() => {
    clearNavigation();
  }, [clearNavigation]);

  // Tìm tên phòng từ node
  const getRoomNameForNode = useCallback(
    (nodeId: string) => {
      const node = navNodes.find((n) => n.id === nodeId);
      if (!node?.roomId) return node?.label ?? nodeId;
      const room = rooms.find((r) => r.id === node.roomId);
      return room?.name ?? node.label ?? nodeId;
    },
    [navNodes, rooms]
  );

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.logoContainer}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div>
            <h1 style={styles.title}>InMap 7A</h1>
            <p style={styles.subtitle}>Bệnh viện Quân y 7A</p>
          </div>
        </div>
      </div>

      {/* ── Chọn Tầng ── */}
      <div style={styles.section}>
        <label style={styles.label}>🏢 Chọn Tầng</label>
        <div style={styles.floorButtons}>
          {floors.map((floor) => (
            <button
              key={floor.id}
              onClick={() => setCurrentFloor(floor.id)}
              style={{
                ...styles.floorBtn,
                ...(currentFloor === floor.id ? styles.floorBtnActive : {}),
              }}
            >
              {floor.id === 0 ? 'T.Trệt' : `T${floor.id}`}
            </button>
          ))}
        </div>
        <p style={styles.floorName}>
          {floors.find((f) => f.id === currentFloor)?.name ?? ''}
        </p>
      </div>

      {/* ── Separator ── */}
      <div style={styles.separator} />

      {/* ── Dẫn đường ── */}
      <div style={styles.section}>
        <label style={styles.label}>🧭 Dẫn đường</label>

        {/* Điểm xuất phát */}
        <div style={styles.fieldGroup}>
          <span style={styles.fieldLabel}>Từ:</span>
          <select
            value={navigation.originNodeId ?? ''}
            onChange={handleOriginChange}
            style={styles.select}
          >
            <option value="">— Chọn điểm đi —</option>
            {roomNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {getRoomNameForNode(node.id)}
              </option>
            ))}
          </select>
        </div>

        {/* Điểm đến */}
        <div style={styles.fieldGroup}>
          <span style={styles.fieldLabel}>Đến:</span>
          <select
            value={navigation.destinationNodeId ?? ''}
            onChange={handleDestChange}
            style={styles.select}
          >
            <option value="">— Chọn điểm đến —</option>
            {roomNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {getRoomNameForNode(node.id)}
              </option>
            ))}
          </select>
        </div>

        {/* Nút hành động */}
        <div style={styles.actionButtons}>
          <button
            onClick={handleNavigate}
            style={{
              ...styles.btn,
              ...styles.btnPrimary,
              ...((!navigation.originNodeId || !navigation.destinationNodeId)
                ? styles.btnDisabled
                : {}),
            }}
            disabled={!navigation.originNodeId || !navigation.destinationNodeId}
          >
            🚀 Tìm đường
          </button>
          <button
            onClick={handleClear}
            style={{ ...styles.btn, ...styles.btnSecondary }}
          >
            ✖ Xóa
          </button>
        </div>

        {/* Thông tin đường đi */}
        {navigation.path.length > 0 && (
          <div style={styles.pathInfo}>
            <span style={styles.pathInfoIcon}>✅</span>
            <span>
              Đã tìm thấy đường đi ({navigation.path.length - 1} đoạn)
            </span>
          </div>
        )}
      </div>

      {/* ── Separator ── */}
      <div style={styles.separator} />

      {/* ── Danh sách phòng ── */}
      <div style={styles.section}>
        <label style={styles.label}>📋 Phòng tầng {currentFloor}</label>
        <div style={styles.roomList}>
          {floorRooms.map((room) => (
            <div key={room.id} style={styles.roomItem}>
              <div
                style={{
                  ...styles.roomDot,
                  backgroundColor: room.color,
                }}
              />
              <div style={styles.roomInfo}>
                <span style={styles.roomName}>{room.name}</span>
                {room.description && (
                  <span style={styles.roomDesc}>{room.description}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={styles.footer}>
        <p>💡 Click vào phòng trên bản đồ để dẫn đường</p>
      </div>
    </div>
  );
}

// ── Inline Styles ──
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    bottom: 16,
    width: 320,
    background: 'linear-gradient(180deg, rgba(15,15,26,0.95) 0%, rgba(20,20,40,0.92) 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(100,100,255,0.05)',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    zIndex: 100,
  },
  header: {
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #00ff88, #00b894)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#0f0f1a',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '-0.3px',
  },
  subtitle: {
    margin: 0,
    fontSize: 11,
    color: '#8892a4',
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  section: {
    padding: '14px 20px',
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 10,
    letterSpacing: '0.5px',
    textTransform: 'uppercase' as const,
  },
  separator: {
    height: 1,
    margin: '0 20px',
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
  },
  floorButtons: {
    display: 'flex',
    gap: 8,
  },
  floorBtn: {
    flex: 1,
    padding: '8px 0',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.03)',
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  floorBtnActive: {
    background: 'linear-gradient(135deg, #00ff88, #00b894)',
    color: '#0f0f1a',
    border: '1px solid transparent',
    boxShadow: '0 4px 15px rgba(0,255,136,0.25)',
  },
  floorName: {
    margin: '8px 0 0',
    fontSize: 11,
    color: '#64748b',
  },
  fieldGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#94a3b8',
    minWidth: 32,
    fontWeight: 500,
  },
  select: {
    flex: 1,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 13,
    outline: 'none',
    cursor: 'pointer',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  actionButtons: {
    display: 'flex',
    gap: 8,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    padding: '10px 0',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #00ff88, #00b894)',
    color: '#0f0f1a',
    boxShadow: '0 4px 15px rgba(0,255,136,0.2)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.06)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  pathInfo: {
    marginTop: 12,
    padding: '8px 12px',
    background: 'rgba(0,255,136,0.08)',
    border: '1px solid rgba(0,255,136,0.2)',
    borderRadius: 8,
    fontSize: 12,
    color: '#00ff88',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pathInfoIcon: {
    fontSize: 14,
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 200,
    overflowY: 'auto',
  },
  roomItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 8,
    transition: 'background 0.15s',
  },
  roomDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 6px currentColor',
  },
  roomInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  roomName: {
    fontSize: 13,
    fontWeight: 500,
    color: '#e2e8f0',
  },
  roomDesc: {
    fontSize: 11,
    color: '#64748b',
  },
  footer: {
    marginTop: 'auto',
    padding: '14px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
  },
};
