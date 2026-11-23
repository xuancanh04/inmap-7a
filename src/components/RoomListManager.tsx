import { useState, useCallback, useMemo, useRef } from 'react';
import { useMapStore } from '../store/useMapStore';
import { calculatePolygonCentroid, calculatePolygonArea } from '../utils/geometry';
import type { Room } from '../types';

const FUNCTION_GROUPS = [
  { id: 'medical', label: 'Y tế / Cấp cứu / Khám', color: '#EF4444', badge: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'office', label: 'Hành chính / Điều hành', color: '#3B82F6', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'utility', label: 'Kỹ thuật / Máy chủ / Kho', color: '#8B5CF6', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'public', label: 'Khu công cộng / Phòng chờ', color: '#10B981', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'pharmacy', label: 'Nhà thuốc / Dược', color: '#06B6D4', badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
] as const;

export function RoomListManager() {
  const rooms = useMapStore((s) => s.rooms);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const addRoom = useMapStore((s) => s.addRoom);
  const updateRoom = useMapStore((s) => s.updateRoom);
  const removeRoom = useMapStore((s) => s.removeRoom);
  const builderPoints = useMapStore((s) => s.builderPoints);
  const clearBuilderPoints = useMapStore((s) => s.clearBuilderPoints);
  const popBuilderPoint = useMapStore((s) => s.popBuilderPoint);
  const builderMode = useMapStore((s) => s.builderMode);
  const toggleBuilderMode = useMapStore((s) => s.toggleBuilderMode);

  // Chế độ chỉnh sửa phòng hiện có
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);

  const [roomName, setRoomName] = useState('');
  const [roomDesc, setRoomDesc] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<typeof FUNCTION_GROUPS[number]['id']>('medical');
  const [doorSideChoice, setDoorSideChoice] = useState<'auto' | 'north' | 'south' | 'east' | 'west' | 'none'>('auto');
  const [filterSearch, setFilterSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Quản lý kéo thả tự do vị trí (Draggable Modal)
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const isDraggingRef = useRef(false);
  const dragStartOffset = useRef({ x: 0, y: 0 });

  const handlePointerDownHeader = (e: React.PointerEvent<HTMLDivElement>) => {
    // Không drag nếu click vào nút bấm trên header
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
    isDraggingRef.current = true;
    setHasMoved(true);
    const rect = (e.currentTarget.parentElement as HTMLElement)?.getBoundingClientRect();
    dragStartOffset.current = {
      x: e.clientX - (rect?.left ?? pos.x),
      y: e.clientY - (rect?.top ?? pos.y),
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const newX = Math.max(10, Math.min(window.innerWidth - 360, e.clientX - dragStartOffset.current.x));
    const newY = Math.max(10, Math.min(window.innerHeight - 100, e.clientY - dragStartOffset.current.y));
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }
  };

  const currentColor = useMemo(() => {
    return FUNCTION_GROUPS.find((g) => g.id === selectedGroup)?.color || '#3B82F6';
  }, [selectedGroup]);

  const currentCentroid = useMemo(() => {
    return calculatePolygonCentroid(builderPoints);
  }, [builderPoints]);

  const currentArea = useMemo(() => {
    return calculatePolygonArea(builderPoints);
  }, [builderPoints]);

  const handleSaveRoom = useCallback(() => {
    // Nếu đang chỉnh sửa phòng đã có
    if (editingRoomId) {
      if (!roomName.trim()) {
        alert('Vui lòng nhập tên phòng!');
        return;
      }
      updateRoom(editingRoomId, {
        name: roomName.trim(),
        description: roomDesc.trim() || undefined,
        type: selectedGroup as Room['type'],
        color: currentColor,
        doorSide: doorSideChoice,
      });
      setEditingRoomId(null);
      setRoomName('');
      setRoomDesc('');
      return;
    }

    // Nếu đang tạo phòng mới từ các điểm chấm trên sàn 3D
    if (builderPoints.length < 3) {
      alert('Vui lòng click ít nhất 3 hoặc 4 điểm góc trên bản vẽ để tạo phòng!');
      return;
    }

    const name = roomName.trim() || `Phòng ${currentFloor}0${rooms.length + 1}`;
    const centroid = calculatePolygonCentroid(builderPoints);

    const newRoom: Room = {
      id: `room-${Date.now()}`,
      name,
      floor: currentFloor,
      polygon: [...builderPoints],
      center: centroid,
      color: currentColor,
      type: selectedGroup as Room['type'],
      doorSide: doorSideChoice,
      description: roomDesc.trim() || `Phòng ${name} - Tầng ${currentFloor}`,
    };

    addRoom(newRoom);
    clearBuilderPoints();
    setRoomName('');
    setRoomDesc('');
  }, [
    editingRoomId,
    roomName,
    roomDesc,
    selectedGroup,
    currentColor,
    doorSideChoice,
    updateRoom,
    builderPoints,
    currentFloor,
    rooms.length,
    addRoom,
    clearBuilderPoints,
  ]);

  const startEditRoom = (r: Room) => {
    setEditingRoomId(r.id);
    setRoomName(r.name);
    setRoomDesc(r.description || '');
    if (r.type && FUNCTION_GROUPS.some((g) => g.id === r.type)) {
      setSelectedGroup(r.type as typeof selectedGroup);
    }
    setDoorSideChoice(r.doorSide || 'auto');
    setIsCollapsed(false);
  };

  const cancelEdit = () => {
    setEditingRoomId(null);
    setRoomName('');
    setRoomDesc('');
  };

  const filteredRooms = useMemo(() => {
    return rooms
      .filter((r) => r.floor === currentFloor)
      .filter((r) => r.name.toLowerCase().includes(filterSearch.toLowerCase()));
  }, [rooms, currentFloor, filterSearch]);

  if (!builderMode) return null;

  return (
    <div
      style={{
        ...styles.container,
        ...(hasMoved
          ? { left: pos.x, top: pos.y, right: 'auto' }
          : { right: 20, top: 76, left: 'auto' }),
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Header kéo thả tiện lợi */}
      <div
        style={styles.header}
        onPointerDown={handlePointerDownHeader}
      >
        <div style={styles.headerTitleRow}>
          <span style={styles.dragHandle} title="Kéo giữ để di chuyển bảng">⋮⋮</span>
          <div>
            <div style={styles.headerTitle}>
              {editingRoomId ? 'Chỉnh sửa phòng 3D' : `Quản lý tạo phòng 3D (Tầng ${currentFloor})`}
            </div>
            <div style={styles.headerSubtitle}>
              {editingRoomId ? 'Sửa tên & thuộc tính phòng' : 'Click sàn 3D để chấm góc & dựng tường'}
            </div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={styles.btnIcon}
            title={isCollapsed ? 'Mở rộng bảng' : 'Thu nhỏ bảng'}
          >
            {isCollapsed ? '▾' : '▴'}
          </button>
          <button
            type="button"
            onClick={toggleBuilderMode}
            style={styles.btnIcon}
            title="Đóng bảng công cụ"
          >
            ✕
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div style={styles.contentBody}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>
                {editingRoomId ? '1. Thông tin chỉnh sửa' : '1. Tạo khối phòng mới'}
              </span>
              {!editingRoomId && (
                <span style={styles.pointsBadge}>
                  {builderPoints.length} điểm đã chọn
                </span>
              )}
            </div>

            {!editingRoomId && builderPoints.length > 0 && (
              <div style={styles.pointsStatus}>
                <div style={styles.pointsList}>
                  <div style={styles.centroidInfo}>
                    Tọa độ tâm: ({currentCentroid.x}, {currentCentroid.z})
                    {currentArea > 0 && ` • Diện tích: ~${currentArea}m²`}
                  </div>
                  <div style={styles.pointsRow}>
                    {builderPoints.map((p, i) => (
                      <span key={i} style={styles.pointTag}>
                        #{i + 1} ({p.x}, {p.z})
                      </span>
                    ))}
                  </div>
                  <div style={styles.btnRowMini}>
                    <button type="button" onClick={popBuilderPoint} style={styles.btnMini}>
                      Xóa điểm cuối
                    </button>
                    <button type="button" onClick={clearBuilderPoints} style={styles.btnMiniDanger}>
                      Xóa tất cả
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={styles.inputGroup}>
              <label style={styles.label}>Tên phòng</label>
              <input
                type="text"
                placeholder="VD: Phòng Hành chính, Cấp cứu..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                style={styles.textInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Mô tả / Khoa phụ trách</label>
              <input
                type="text"
                placeholder="VD: Khám tổng quát & tư vấn điều trị"
                value={roomDesc}
                onChange={(e) => setRoomDesc(e.target.value)}
                style={styles.textInput}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Nhóm chức năng & Màu</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value as typeof selectedGroup)}
                style={styles.selectInput}
              >
                {FUNCTION_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Vị trí mở cửa phòng</label>
              <select
                value={doorSideChoice}
                onChange={(e) => setDoorSideChoice(e.target.value as typeof doorSideChoice)}
                style={styles.selectInput}
              >
                <option value="auto">Tự động (cạnh dài nhất)</option>
                <option value="north">Hướng Bắc (phía trên)</option>
                <option value="south">Hướng Nam (phía dưới)</option>
                <option value="east">Hướng Đông (bên phải)</option>
                <option value="west">Hướng Tây (bên trái)</option>
                <option value="none">Tường kín (không mở cửa)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              {editingRoomId && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn phòng này?')) {
                        removeRoom(editingRoomId);
                        cancelEdit();
                      }
                    }}
                    style={styles.btnDeleteEditing}
                    title="Xóa vĩnh viễn phòng này"
                  >
                    Xóa phòng
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    style={styles.btnCancelEdit}
                  >
                    Hủy
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={handleSaveRoom}
                disabled={!editingRoomId && builderPoints.length < 3}
                style={{
                  ...styles.btnPrimary,
                  ...((!editingRoomId && builderPoints.length < 3) ? styles.btnDisabled : {}),
                }}
              >
                {editingRoomId ? 'Lưu thay đổi' : 'Tạo phòng & Dựng tường 3D'}
              </button>
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>
                2. Danh sách phòng ({filteredRooms.length})
              </span>
            </div>

            <input
              type="text"
              placeholder="🔍 Tìm nhanh tên phòng..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              style={styles.searchBar}
            />

            <div style={styles.roomList}>
              {filteredRooms.length === 0 ? (
                <div style={styles.emptyText}>Chưa có phòng nào trên tầng {currentFloor}.</div>
              ) : (
                filteredRooms.map((r) => (
                  <div key={r.id} style={{
                    ...styles.roomCard,
                    borderColor: editingRoomId === r.id ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                    background: editingRoomId === r.id ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.03)',
                  }}>
                    <div style={styles.roomCardLeft}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={styles.roomCardName}>{r.name}</div>
                        <div style={styles.roomCardDetails}>
                          Tâm: ({r.center.x}, {r.center.z})
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => startEditRoom(r)}
                        style={styles.btnEdit}
                        title="Chỉnh sửa tên & thông tin phòng"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc chắn muốn xóa phòng "${r.name}"?`)) {
                            removeRoom(r.id);
                            if (editingRoomId === r.id) {
                              cancelEdit();
                            }
                          }
                        }}
                        style={styles.btnDelete}
                        title="Xóa phòng này"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    right: 20,
    top: 76,
    width: 350,
    maxHeight: 'calc(100vh - 90px)',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(56, 189, 248, 0.35)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 35px rgba(56, 189, 248, 0.2)',
    color: '#f8fafc',
    zIndex: 999999,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.3)',
    cursor: 'move',
    touchAction: 'none',
  },
  dragHandle: {
    fontSize: 16,
    color: '#38bdf8',
    cursor: 'grab',
    paddingRight: 4,
    opacity: 0.8,
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#38bdf8',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  headerActions: {
    display: 'flex',
    gap: 4,
  },
  btnIcon: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#cbd5e1',
    cursor: 'pointer',
    fontSize: 13,
    width: 26,
    height: 26,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    overflowY: 'auto',
    maxHeight: 'calc(100vh - 150px)',
  },
  section: {
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#cbd5e1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pointsBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    fontWeight: 600,
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  pointsStatus: {
    background: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  pointsHint: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  pointsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  centroidInfo: {
    fontSize: 11,
    color: '#34d399',
    fontWeight: 600,
  },
  pointsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  },
  pointTag: {
    fontSize: 10,
    background: 'rgba(255,255,255,0.08)',
    padding: '2px 6px',
    borderRadius: 4,
    color: '#e2e8f0',
  },
  btnRowMini: {
    display: 'flex',
    gap: 6,
    marginTop: 2,
  },
  btnMini: {
    flex: 1,
    padding: '4px 8px',
    fontSize: 11,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#cbd5e1',
    cursor: 'pointer',
  },
  btnMiniDanger: {
    padding: '4px 8px',
    fontSize: 11,
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 6,
    color: '#ef4444',
    cursor: 'pointer',
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 4,
  },
  textInput: {
    width: '100%',
    padding: '7px 10px',
    background: 'rgba(0,0,0,0.35)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  selectInput: {
    width: '100%',
    padding: '7px 10px',
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnPrimary: {
    flex: 1,
    padding: '9px 12px',
    background: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',
    border: 'none',
    borderRadius: 8,
    color: '#000000',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(14, 165, 233, 0.35)',
    transition: 'all 0.2s ease',
  },
  btnDeleteEditing: {
    padding: '9px 12px',
    background: 'rgba(239, 68, 68, 0.18)',
    border: '1px solid rgba(239, 68, 68, 0.4)',
    borderRadius: 8,
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnCancelEdit: {
    padding: '9px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  btnExport: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 600,
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    borderRadius: 6,
    color: '#34d399',
    cursor: 'pointer',
  },
  searchBar: {
    width: '100%',
    padding: '6px 10px',
    background: 'rgba(0,0,0,0.25)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 6,
    color: '#ffffff',
    fontSize: 11,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 8,
  },
  roomList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 180,
    overflowY: 'auto',
  },
  emptyText: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    padding: 12,
  },
  roomCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'all 0.15s ease',
  },
  roomCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  roomCardName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  roomCardDetails: {
    fontSize: 10,
    color: '#94a3b8',
  },
  btnEdit: {
    background: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
  btnDelete: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
};

export default RoomListManager;
