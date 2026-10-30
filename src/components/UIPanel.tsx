import type React from 'react';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';

export function UIPanel() {
  const floors = useMapStore((s) => s.floors);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const rooms = useMapStore((s) => s.rooms);
  const navNodes = useMapStore((s) => s.navNodes);
  const navigation = useMapStore((s) => s.navigation);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);
  const clearNavigation = useMapStore((s) => s.clearNavigation);
  const navigateToRoom = useMapStore((s) => s.navigateToRoom);

  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  const [originSearchText, setOriginSearchText] = useState('');
  const [isOriginCustom, setIsOriginCustom] = useState(false);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [destSearchText, setDestSearchText] = useState('');

  const routeCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (routeCardRef.current && !routeCardRef.current.contains(e.target as Node)) {
        setShowOriginSuggestions(false);
        setShowDestSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const floorRooms = useMemo(() => {
    return rooms.filter((r) => r.floor === currentFloor);
  }, [rooms, currentFloor]);

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

  const originSuggestions = useMemo(() => {
    if (!originSearchText.trim()) return roomNodes;
    const q = originSearchText.toLowerCase();
    return roomNodes.filter((n) => {
      const name = getRoomNameForNode(n.id).toLowerCase();
      return name.includes(q);
    });
  }, [roomNodes, originSearchText, getRoomNameForNode]);

  const destSuggestions = useMemo(() => {
    if (!destSearchText.trim()) return roomNodes;
    const q = destSearchText.toLowerCase();
    return roomNodes.filter((n) => {
      const name = getRoomNameForNode(n.id).toLowerCase();
      return name.includes(q);
    });
  }, [roomNodes, destSearchText, getRoomNameForNode]);

  const handleSelectOrigin = (nodeId: string | null) => {
    const state = useMapStore.getState();
    if (nodeId === null) {

      setIsOriginCustom(false);
      setOriginSearchText('');
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
        },
      });
    } else {
      setIsOriginCustom(true);
      const name = getRoomNameForNode(nodeId);
      setOriginSearchText(name);
      useMapStore.setState({
        navigation: {
          ...state.navigation,
          originNodeId: nodeId,
        },
      });
    }
    useMapStore.getState().calculatePath();
    setShowOriginSuggestions(false);
  };

  const handleSelectDestination = (nodeId: string | null) => {
    const state = useMapStore.getState();
    if (!nodeId) {
      setDestSearchText('');
      handleClear();
      setShowDestSuggestions(false);
      return;
    }

    const name = getRoomNameForNode(nodeId);
    setDestSearchText(name);

    let originId = state.navigation.originNodeId;
    if (!isOriginCustom || !originId) {
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
      originId = nearestOrigin?.id ?? null;
    }

    useMapStore.setState({
      navigation: {
        ...state.navigation,
        originNodeId: originId,
        destinationNodeId: nodeId,
      },
    });
    useMapStore.getState().calculatePath();
    setShowDestSuggestions(false);

    if (window.innerWidth <= 768) {
      setIsMobileCollapsed(true);
    }
  };

  const handleSwapRoute = () => {
    const currentOrigin = navigation.originNodeId;
    const currentDest = navigation.destinationNodeId;
    if (!currentOrigin && !currentDest) return;

    const newDest = currentOrigin;
    const newOrigin = currentDest;

    if (newOrigin) {
      setIsOriginCustom(true);
      setOriginSearchText(getRoomNameForNode(newOrigin));
    } else {
      setIsOriginCustom(false);
      setOriginSearchText('');
    }

    if (newDest) {
      setDestSearchText(getRoomNameForNode(newDest));
    } else {
      setDestSearchText('');
    }

    useMapStore.setState({
      navigation: {
        ...navigation,
        originNodeId: newOrigin,
        destinationNodeId: newDest,
      },
    });
    useMapStore.getState().calculatePath();
  };

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

        <div ref={routeCardRef} style={styles.routeCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ position: 'relative' }}>
                <div style={styles.routeRow}>
                  <div style={styles.pointIndicatorOrigin} />
                  <input
                    type="text"
                    value={
                      isOriginCustom
                        ? originSearchText
                        : 'Vị trí của bạn'
                    }
                    placeholder="Vị trí của bạn"
                    onFocus={(e) => {
                      if (!isOriginCustom) {
                        e.target.select();
                      }
                      setShowOriginSuggestions(true);
                    }}
                    onChange={(e) => {
                      setOriginSearchText(e.target.value);
                      setIsOriginCustom(true);
                      setShowOriginSuggestions(true);
                    }}
                    style={{
                      ...styles.routeInput,
                      color: !isOriginCustom ? '#60a5fa' : '#ffffff',
                      fontWeight: !isOriginCustom ? 700 : 500,
                    }}
                  />
                  {isOriginCustom && (
                    <button
                      type="button"
                      onClick={() => handleSelectOrigin(null)}
                      style={styles.fieldClearBtn}
                      title="Đặt lại về Vị trí của bạn"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showOriginSuggestions && (
                  <div style={styles.suggestionsDropdown}>
                    <div
                      onClick={() => handleSelectOrigin(null)}
                      style={{
                        ...styles.suggestionItem,
                        color: '#60a5fa',
                        fontWeight: 700,
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      }}
                    >
                      📍 Vị trí của bạn (GPS / Beacon tự động)
                    </div>
                    {originSuggestions.length === 0 ? (
                      <div style={styles.suggestionEmpty}>Không tìm thấy phòng</div>
                    ) : (
                      originSuggestions.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => handleSelectOrigin(node.id)}
                          style={styles.suggestionItem}
                        >
                          <span style={{ color: '#94a3b8', marginRight: 6 }}>🚪</span>
                          {getRoomNameForNode(node.id)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div style={styles.routeDivider} />

              <div style={{ position: 'relative' }}>
                <div style={styles.routeRow}>
                  <div style={styles.pointIndicatorDest} />
                  <input
                    type="text"
                    value={
                      navigation.destinationNodeId && !destSearchText
                        ? getRoomNameForNode(navigation.destinationNodeId)
                        : destSearchText
                    }
                    placeholder="Chọn hoặc nhập phòng muốn đến..."
                    onFocus={() => setShowDestSuggestions(true)}
                    onChange={(e) => {
                      setDestSearchText(e.target.value);
                      setShowDestSuggestions(true);
                    }}
                    style={styles.routeInput}
                  />
                  {(destSearchText || navigation.destinationNodeId) && (
                    <button
                      type="button"
                      onClick={() => {
                        setDestSearchText('');
                        handleClear();
                      }}
                      style={styles.fieldClearBtn}
                      title="Hủy điểm đến"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showDestSuggestions && (
                  <div style={styles.suggestionsDropdown}>
                    {destSuggestions.length === 0 ? (
                      <div style={styles.suggestionEmpty}>Không tìm thấy phòng</div>
                    ) : (
                      destSuggestions.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => handleSelectDestination(node.id)}
                          style={styles.suggestionItem}
                        >
                          <span style={{ color: '#ef4444', marginRight: 6 }}>📍</span>
                          {getRoomNameForNode(node.id)}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSwapRoute}
              style={styles.swapBtn}
              title="Đổi chiều đi (Hoán đổi điểm xuất phát và điểm đến)"
            >
              ⇅
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    maxHeight: 'calc(100vh - 32px)',
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
  routeInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    padding: '4px 0',
    width: '100%',
  },
  fieldClearBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 12,
    padding: '2px 6px',
    lineHeight: 1,
  },
  swapBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#38bdf8',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  suggestionsDropdown: {
    position: 'absolute',
    top: '100%',
    left: 20,
    right: 0,
    maxHeight: 180,
    overflowY: 'auto',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
    marginTop: 4,
  },
  suggestionItem: {
    padding: '8px 12px',
    fontSize: 12,
    color: '#f1f5f9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.15s',
  },
  suggestionEmpty: {
    padding: '10px 12px',
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
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
    flex: 1,
    minHeight: 0,
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
    maxHeight: 'min(42vh, 380px)',
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
