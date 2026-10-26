// ============================================================================
// InMap 7A — RoomListManager.tsx
// Bảng quản lý danh sách phòng + Batch 3D Extruder + Xuất dữ liệu JSON
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { useMapStore } from '../store/useMapStore';
import { calculatePolygonCentroid, calculatePolygonArea } from '../utils/geometry';
import type { Room } from '../types';

/** Nhóm chức năng phòng bệnh viện & màu sắc nhận diện tương ứng */
export const FUNCTION_GROUPS = [
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
  const removeRoom = useMapStore((s) => s.removeRoom);
  const builderPoints = useMapStore((s) => s.builderPoints);
  const clearBuilderPoints = useMapStore((s) => s.clearBuilderPoints);
  const popBuilderPoint = useMapStore((s) => s.popBuilderPoint);
  const builderMode = useMapStore((s) => s.builderMode);
  const toggleBuilderMode = useMapStore((s) => s.toggleBuilderMode);

  // Form input state
  const [roomName, setRoomName] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<typeof FUNCTION_GROUPS[number]['id']>('medical');
  const [filterSearch, setFilterSearch] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Lấy màu tương ứng với nhóm
  const currentColor = useMemo(() => {
    return FUNCTION_GROUPS.find((g) => g.id === selectedGroup)?.color || '#3B82F6';
  }, [selectedGroup]);

  // Tự động tính tâm đa giác (Centroid) chính xác từ các điểm đang chấm
  const currentCentroid = useMemo(() => {
    return calculatePolygonCentroid(builderPoints);
  }, [builderPoints]);

  const currentArea = useMemo(() => {
    return calculatePolygonArea(builderPoints);
  }, [builderPoints]);

  // 1. Thêm phòng mới vào hệ thống (Tự động đùn 3D ngay lập tức)
  const handleCreateRoom = useCallback(() => {
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
      description: `Phòng ${name} - Tầng ${currentFloor}`,
    };

    addRoom(newRoom);
    clearBuilderPoints();
    setRoomName('');
  }, [
    builderPoints,
    roomName,
    currentFloor,
    rooms.length,
    currentColor,
    selectedGroup,
    addRoom,
    clearBuilderPoints,
  ]);

  // 2. Xuất dữ liệu JSON chuẩn
  const handleExportJSON = useCallback(() => {
    const exportData = {
      hospital: 'Bệnh viện Quân y 7A',
      exportDate: new Date().toISOString(),
      floor: currentFloor,
      totalRooms: rooms.length,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        floor: r.floor,
        type: r.type,
        color: r.color,
        center: r.center,
        polygon: r.polygon,
        description: r.description,
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `InMap7A_Floor_${currentFloor}_Rooms.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [rooms, currentFloor]);

  // Danh sách phòng tầng hiện tại
  const filteredRooms = useMemo(() => {
    return rooms
      .filter((r) => r.floor === currentFloor)
      .filter((r) => r.name.toLowerCase().includes(filterSearch.toLowerCase()));
  }, [rooms, currentFloor, filterSearch]);

  if (!builderMode) return null;

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerTitleRow}>
          <span style={styles.headerIcon}>🏢</span>
          <div>
            <div style={styles.headerTitle}>Room List Manager (Tầng {currentFloor})</div>
            <div style={styles.headerSubtitle}>Tự động dựng phòng 3D từ bản vẽ 2D</div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={styles.btnIcon}
            title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
          <button
            onClick={toggleBuilderMode}
            style={styles.btnIcon}
            title="Đóng bảng quản lý"
          >
            ✕
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* ── Khung nhập liệu tạo phòng ── */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>1. Tạo khối phòng mới</span>
              <span style={styles.pointsBadge}>
                {builderPoints.length} điểm đã click
              </span>
            </div>

            {/* Trạng thái click tọa độ 4 góc */}
            <div style={styles.pointsStatus}>
              {builderPoints.length === 0 ? (
                <div style={styles.pointsHint}>
                  👉 Hãy click các góc phòng trên bản đồ sàn để lấy tọa độ polygon.
                </div>
              ) : (
                <div style={styles.pointsList}>
                  <div style={styles.centroidInfo}>
                    Tâm đa giác (Centroid): ({currentCentroid.x}, {currentCentroid.z})
                    {currentArea > 0 && ` • Diện tích ≈ ${currentArea}m²`}
                  </div>
                  <div style={styles.pointsRow}>
                    {builderPoints.map((p, i) => (
                      <span key={i} style={styles.pointTag}>
                        #{i + 1}: ({p.x}, {p.z})
                      </span>
                    ))}
                  </div>
                  <div style={styles.btnRowMini}>
                    <button onClick={popBuilderPoint} style={styles.btnMini}>
                      ↩ Xóa điểm cuối
                    </button>
                    <button onClick={clearBuilderPoints} style={styles.btnMiniDanger}>
                      🗑 Xóa hết
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Nhập tên phòng */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Tên phòng:</label>
              <input
                type="text"
                placeholder="VD: Phòng Hành chính, Cấp cứu..."
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                style={styles.textInput}
              />
            </div>

            {/* Chọn nhóm chức năng */}
            <div style={styles.inputGroup}>
              <label style={styles.label}>Nhóm chức năng & Màu nhận diện:</label>
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

            {/* Nút bấm tự động đùn 3D */}
            <button
              onClick={handleCreateRoom}
              disabled={builderPoints.length < 3}
              style={{
                ...styles.btnPrimary,
                ...(builderPoints.length < 3 ? styles.btnDisabled : {}),
              }}
            >
              ✨ Tự Động Đùn Khối 3D (Extrude)
            </button>
          </div>

          {/* ── Danh sách các phòng đã dựng trên tầng ── */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionTitle}>
                2. Danh sách phòng 3D ({filteredRooms.length})
              </span>
              <button onClick={handleExportJSON} style={styles.btnExport} title="Tải file JSON">
                💾 Xuất JSON
              </button>
            </div>

            {/* Tìm kiếm phòng */}
            <input
              type="text"
              placeholder="🔍 Tìm nhanh phòng..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              style={styles.searchBar}
            />

            {/* Danh sách cuộn */}
            <div style={styles.roomList}>
              {filteredRooms.length === 0 ? (
                <div style={styles.emptyText}>Chưa có phòng nào trên tầng {currentFloor}.</div>
              ) : (
                filteredRooms.map((r) => (
                  <div key={r.id} style={styles.roomCard}>
                    <div style={styles.roomCardLeft}>
                      <span
                        style={{
                          ...styles.colorDot,
                          backgroundColor: r.color,
                        }}
                      />
                      <div>
                        <div style={styles.roomCardName}>{r.name}</div>
                        <div style={styles.roomCardDetails}>
                          Tâm: ({r.center.x}, {r.center.z}) • {r.polygon.length} góc
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRoom(r.id)}
                      style={styles.btnDelete}
                      title="Xóa phòng này"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 70,
    right: 16,
    width: 360,
    maxHeight: 'calc(100vh - 90px)',
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(56, 189, 248, 0.3)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 35px rgba(56, 189, 248, 0.15)',
    color: '#f8fafc',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.2)',
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#38bdf8',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  headerActions: {
    display: 'flex',
    gap: 4,
  },
  btnIcon: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 6px',
  },
  section: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
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
    background: 'rgba(0,0,0,0.3)',
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
    width: '100%',
    marginTop: 4,
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
    background: 'rgba(0,0,0,0.2)',
    border: '1px solid rgba(255,255,255,0.08)',
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
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.05)',
  },
  roomCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  roomCardName: {
    fontSize: 12,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  roomCardDetails: {
    fontSize: 10,
    color: '#94a3b8',
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    padding: '2px 6px',
    fontSize: 12,
  },
};

export default RoomListManager;
