// ============================================================================
// InMap 7A — UIPanel.tsx
// Bảng điều khiển UI Hiện đại: Apple Maps & Google Maps Styling
// Glassmorphism, Danh mục nhanh, Tìm kiếm thông minh, Thu gọn cài đặt Beacon
// ============================================================================

import type React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { useMapStore } from '../store/useMapStore';
import {
  startWebBleBeaconScanner,
  activateBeaconViaUsbRunInRam,
} from '../utils/beaconPositioning';

export function UIPanel() {
  const floors = useMapStore((s) => s.floors);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const rooms = useMapStore((s) => s.rooms);
  const navNodes = useMapStore((s) => s.navNodes);
  const navigation = useMapStore((s) => s.navigation);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);
  const clearNavigation = useMapStore((s) => s.clearNavigation);

  const navigateToRoom = useMapStore((s) => s.navigateToRoom);
  const beacons = useMapStore((s) => s.beacons);
  const showBeacons = useMapStore((s) => s.showBeacons);
  const toggleShowBeacons = useMapStore((s) => s.toggleShowBeacons);
  const activeBeaconMinor = useMapStore((s) => s.activeBeaconMinor);
  const simulateNearestBeacon = useMapStore((s) => s.simulateNearestBeacon);
  const isBleScanning = useMapStore((s) => s.isBleScanning);
  const setBleScanning = useMapStore((s) => s.setBleScanning);

  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);
  const [showBleSettings, setShowBleSettings] = useState(false);
  const [bleStatusText, setBleStatusText] = useState<string>('');

  // Lọc phòng theo tầng và từ khóa tìm kiếm
  const floorRooms = useMemo(() => {
    return rooms
      .filter((r) => r.floor === currentFloor)
      .filter((r) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
          r.name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      });
  }, [rooms, currentFloor, searchTerm]);


  const roomNodes = useMemo(

    () => navNodes.filter((n) => n.floor === currentFloor && n.roomId),
    [navNodes, currentFloor]
  );

  const handleClear = useCallback(() => {
    clearNavigation();
  }, [clearNavigation]);


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
    <div
      className="uipanel-mobile"
      style={{
        ...styles.container,
        ...(isMobileCollapsed
          ? { maxHeight: 76, overflow: 'hidden' }
          : { maxHeight: 'min(86vh, 720px)' }),
      }}
    >
      {/* ── Header vuốt chạm phong cách iOS ── */}
      <div
        onClick={() => setIsMobileCollapsed((prev) => !prev)}
        style={styles.header}
        title="Nhấn để thu gọn / mở rộng bảng điều khiển"
      >
        <div style={styles.dragBar} />

        <div style={styles.headerContent}>
          <div style={styles.logoBadge}>
            <img
              src="/logo.png"
              alt="Logo Bệnh Viện Quân Y 7A"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <h1 style={styles.appTitle}>InMap 7A</h1>
              <span style={styles.statusBadge}>Trực Tuyến</span>
            </div>
            <p style={styles.hospitalName}>Bệnh Viện Quân Y 7A</p>
          </div>
          <button type="button" style={styles.iconCircleBtn} aria-label="Toggle">
            {isMobileCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* ── Thân cuộn mượt mà ── */}
      <div
        style={{
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          flex: 1,
          display: isMobileCollapsed ? 'none' : 'flex',
          flexDirection: 'column',
          gap: 14,
          padding: '12px 16px 20px',
        }}
      >
        {/* ── 1. Chọn Tầng (iOS Segmented Pill Bar) ── */}
        <div style={styles.segmentedContainer}>
          {floors.map((floor) => {
            const active = currentFloor === floor.id;
            return (
              <button
                key={floor.id}
                onClick={() => setCurrentFloor(floor.id)}
                style={{
                  ...styles.segmentedItem,
                  ...(active ? styles.segmentedItemActive : {}),
                }}
              >
                {floor.id === 0 ? 'Tầng Trệt' : `Tầng ${floor.id}`}
              </button>
            );
          })}
        </div>

        {/* ── 2. Thanh Tìm Kiếm Google Maps ── */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm phòng khám, khoa điều trị..."
            style={styles.searchInput}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={styles.searchClearBtn}
            >
              ✕
            </button>
          )}
        </div>

        {/* ── 3. Khung Dẫn Đường Chuẩn Google Maps (Điểm đi = Vị trí của bạn) ── */}
        <div style={styles.routeCard}>

          {/* Điểm đi cố định: Vị trí của bạn */}
          <div style={styles.routeRow}>
            <div style={styles.pointIndicatorOrigin} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
                Vị trí của bạn
              </span>
            </div>
          </div>


          <div style={styles.routeDivider} />

          {/* Điểm đến: Chọn phòng là dẫn đường ngay */}
          <div style={styles.routeRow}>
            <div style={styles.pointIndicatorDest} />
            <select
              value={navigation.destinationNodeId ?? ''}
              onChange={(e) => {
                const destId = e.target.value;
                if (destId) {
                  // Tự động gán điểm đi = node gần vị trí người dùng nhất
                  const state = useMapStore.getState();
                  const floorNodes = state.navNodes.filter((n) => n.floor === state.currentFloor);
                  let nearestOrigin = floorNodes[0];
                  if (state.userPosition) {
                    let minDist = Infinity;
                    for (const node of floorNodes) {
                      const dist = Math.hypot(node.position.x - state.userPosition.x, node.position.z - state.userPosition.z);
                      if (dist < minDist) {
                        minDist = dist;
                        nearestOrigin = node;
                      }
                    }
                  }
                  useMapStore.setState({
                    navigation: {
                      ...state.navigation,
                      originNodeId: nearestOrigin?.id ?? null,
                      destinationNodeId: destId,
                    },
                  });
                  useMapStore.getState().calculatePath();
                  if (window.innerWidth <= 768) {
                    setIsMobileCollapsed(true);
                  }
                } else {
                  handleClear();
                }
              }}
              style={styles.routeSelect}
            >
              <option value="">🔍 Chạm để chọn phòng bạn muốn đến...</option>
              {roomNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {getRoomNameForNode(n.id)}
                </option>
              ))}
            </select>
            {navigation.destinationNodeId && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '4px 8px',
                }}
                title="Hủy đường dẫn"
              >
                ✕
              </button>
            )}
          </div>
        </div>


        {/* ── 5. Danh Sách Phòng Theo Tầng ── */}
        <div style={styles.roomListSection}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>
              Danh sách phòng ({floorRooms.length})
            </span>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Chạm vào để đi tới
            </span>
          </div>

          <div style={styles.roomListContainer}>
            {floorRooms.length === 0 ? (
              <div style={styles.emptyState}>Không tìm thấy phòng phù hợp</div>
            ) : (
              floorRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => {
                    navigateToRoom(room.id);
                    if (window.innerWidth <= 768) setIsMobileCollapsed(true);
                  }}
                  style={styles.roomCard}
                >
                  <div
                    style={{
                      ...styles.roomDotBadge,
                      backgroundColor: room.color || '#3b82f6',
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.roomCardName}>{room.name}</div>
                    {room.description && (
                      <div style={styles.roomCardDesc}>{room.description}</div>
                    )}
                  </div>
                  <span style={styles.roomCardArrow}>➔</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 6. Cài đặt Kỹ thuật & Quản lý BLE Beacon (Thu gọn vào Accordion) ── */}
        <div style={styles.bleAccordion}>
          <button
            type="button"
            onClick={() => setShowBleSettings((v) => !v)}
            style={styles.accordionHeader}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚙️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>
                Cài đặt & Định vị Beacon ({beacons.length})
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>
              {showBleSettings ? 'Đóng ▲' : 'Mở ▼'}
            </span>
          </button>

          {showBleSettings && (
            <div style={styles.accordionBody}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button
                  onClick={async () => {
                    setBleStatusText('Đang mở cổng USB...');
                    const success = await activateBeaconViaUsbRunInRam((log) =>
                      setBleStatusText(log)
                    );
                    if (success) simulateNearestBeacon(1);
                  }}
                  style={styles.techBtnAmber}
                >
                  🔌 Nạp RAM USB
                </button>
                <button
                  onClick={async () => {
                    if (isBleScanning) {
                      setBleScanning(false);
                      setBleStatusText('Đã dừng quét Bluetooth');
                      return;
                    }
                    setBleStatusText('Đang quét sóng iBeacon...');
                    const success = await startWebBleBeaconScanner(
                      (minor, rssi) => {
                        setBleStatusText(`Bắt được Beacon ${minor} (${rssi} dBm)`);
                        simulateNearestBeacon(minor);
                      }
                    );
                    if (success) setBleScanning(true);
                  }}
                  style={isBleScanning ? styles.techBtnGreen : styles.techBtnSky}
                >
                  {isBleScanning ? '📶 Đang quét' : '⚡ Quét BLE'}
                </button>
                <button onClick={toggleShowBeacons} style={styles.techBtnGray}>
                  {showBeacons ? 'Ẩn 3D' : 'Hiện 3D'}
                </button>
              </div>

              {bleStatusText && (
                <div style={styles.techStatusBox}>{bleStatusText}</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {beacons.map((b) => {
                  const isCurrent = activeBeaconMinor === b.minor;
                  return (
                    <div
                      key={b.id}
                      onClick={() => simulateNearestBeacon(b.minor)}
                      style={{
                        ...styles.beaconPill,
                        ...(isCurrent ? styles.beaconPillActive : {}),
                      }}
                    >
                      <span>{isCurrent ? '🟢' : '📡'} {b.name}</span>
                      <span style={{ color: '#64748b', fontSize: 10 }}>M:{b.minor}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Bảng màu & Style CSS Chuẩn Mobile Google Maps ──
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    bottom: 16,
    width: 340,
    background: 'rgba(15, 23, 42, 0.88)',
    backdropFilter: 'blur(28px) saturate(190%)',
    WebkitBackdropFilter: 'blur(28px) saturate(190%)',
    borderRadius: 24,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow:
      '0 24px 64px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)',
    color: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    zIndex: 99999,
    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  header: {
    padding: '12px 16px 10px',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  dragBar: {
    width: 40,
    height: 4,
    borderRadius: 3,
    background: 'rgba(255, 255, 255, 0.3)',
    margin: '0 auto 8px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
  },
  appTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.3px',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 700,
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    padding: '2px 6px',
    borderRadius: 10,
    border: '1px solid rgba(16, 185, 129, 0.4)',
  },
  hospitalName: {
    margin: '2px 0 0',
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500,
  },
  iconCircleBtn: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    cursor: 'pointer',
  },
  segmentedContainer: {
    display: 'flex',
    background: 'rgba(0, 0, 0, 0.35)',
    padding: 3,
    borderRadius: 14,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    gap: 3,
  },
  segmentedItem: {
    flex: 1,
    padding: '7px 0',
    border: 'none',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 11,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  segmentedItemActive: {
    background: '#3b82f6',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.45)',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    fontSize: 13,
    color: '#64748b',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 32px 10px 34px',
    background: 'rgba(255, 255, 255, 0.07)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border 0.2s',
  },
  searchClearBtn: {
    position: 'absolute',
    right: 10,
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    fontSize: 12,
    cursor: 'pointer',
  },
  quickChipsScroll: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 2,
    scrollbarWidth: 'none',
  },
  chipBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 20,
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
  },
  chipBtnActive: {
    background: 'rgba(59, 130, 246, 0.25)',
    borderColor: '#3b82f6',
    color: '#60a5fa',
  },
  routeCard: {
    background: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  routeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  pointIndicatorOrigin: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#3b82f6',
    boxShadow: '0 0 8px #3b82f6',
    flexShrink: 0,
  },
  pointIndicatorDest: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#ef4444',
    boxShadow: '0 0 8px #ef4444',
    flexShrink: 0,
  },
  routeDivider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.06)',
    margin: '0 0 0 20px',
  },
  routeSelect: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
  },
  btnNavPrimary: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    color: '#ffffff',
    border: 'none',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
    transition: 'opacity 0.2s',
  },
  btnNavDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  btnNavClear: {
    padding: '10px 14px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.08)',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontWeight: 700,
  },
  roomListSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  },
  roomListContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 210,
    overflowY: 'auto',
  },
  emptyState: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    padding: '16px 0',
  },
  roomCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 12,
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  roomDotBadge: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  roomCardName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#f1f5f9',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roomCardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roomCardArrow: {
    fontSize: 12,
    color: '#64748b',
  },
  bleAccordion: {
    borderRadius: 14,
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  accordionHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  accordionBody: {
    padding: '0 12px 12px',
  },
  techBtnAmber: {
    flex: 1,
    padding: '7px',
    background: 'rgba(234, 179, 8, 0.16)',
    color: '#facc15',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  techBtnGreen: {
    flex: 1,
    padding: '7px',
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid #10b981',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  techBtnSky: {
    flex: 1,
    padding: '7px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  techBtnGray: {
    padding: '7px 10px',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    fontSize: 11,
    cursor: 'pointer',
  },
  techStatusBox: {
    fontSize: 11,
    color: '#38bdf8',
    padding: '6px 10px',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: 8,
    marginBottom: 8,
  },
  beaconPill: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 10px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.03)',
    fontSize: 11,
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  beaconPillActive: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.4)',
  },
};
