import React, { useState, useMemo } from 'react';
import { MapCanvas } from './MapCanvas';
import { RoomListManager } from './RoomListManager';
import { useMapStore } from '../store/useMapStore';
import {
  startWebBleBeaconScanner,
  activateBeaconViaUsbRunInRam,
} from '../utils/beaconPositioning';

export function AdminDashboard() {
  const beacons = useMapStore((s) => s.beacons);
  const setBeacons = useMapStore((s) => s.setBeacons);
  const activeBeaconMinor = useMapStore((s) => s.activeBeaconMinor);
  const simulateNearestBeacon = useMapStore((s) => s.simulateNearestBeacon);
  const isBleScanning = useMapStore((s) => s.isBleScanning);
  const setBleScanning = useMapStore((s) => s.setBleScanning);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);
  const floors = useMapStore((s) => s.floors);
  const userPosition = useMapStore((s) => s.userPosition);
  const rooms = useMapStore((s) => s.rooms);
  const updateRoom = useMapStore((s) => s.updateRoom);
  const addFloor = useMapStore((s) => s.addFloor);
  const builderMode = useMapStore((s) => s.builderMode);
  const toggleBuilderMode = useMapStore((s) => s.toggleBuilderMode);
  const builderPoints = useMapStore((s) => s.builderPoints);

  const [activeTab, setActiveTab] = useState<'rooms' | 'beacons' | 'scanner' | 'add'>('rooms');
  const [showAddFloorModal, setShowAddFloorModal] = useState(false);
  const [newFloorNumber, setNewFloorNumber] = useState<number>(2);
  const [newFloorName, setNewFloorName] = useState('');
  const [newFloorImage, setNewFloorImage] = useState<string>('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [editingRoomDesc, setEditingRoomDesc] = useState('');
  const [editingDoorSide, setEditingDoorSide] = useState<string>('auto');
  const [editingNoWall, setEditingNoWall] = useState<boolean>(false);
  const [editingWallColor, setEditingWallColor] = useState<string>('#38bdf8');
  const [roomSearchFilter, setRoomSearchFilter] = useState('');
  const [bleStatusText, setBleStatusText] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');

  const [newBeaconName, setNewBeaconName] = useState('');
  const [newBeaconMinor, setNewBeaconMinor] = useState<number | string>(
    beacons.length > 0 ? Math.max(...beacons.map((b) => b.minor)) + 1 : 1
  );
  const [newBeaconFloor, setNewBeaconFloor] = useState(currentFloor);
  const [newBeaconX, setNewBeaconX] = useState<number | string>(20);
  const [newBeaconZ, setNewBeaconZ] = useState<number | string>(20);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinor, setEditMinor] = useState<number | string>(1);
  const [editX, setEditX] = useState<number | string>(20);
  const [editZ, setEditZ] = useState<number | string>(20);

  const [selectedUsbMinor, setSelectedUsbMinor] = useState<number>(1);

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [mobileView, setMobileView] = useState<'sidebar' | 'map'>('sidebar');

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [discoveredBeacons, setDiscoveredBeacons] = useState<
    Map<number, { minor: number; rssi: number; lastSeen: number }>
  >(new Map());

  const startEdit = (b: typeof beacons[0]) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditMinor(b.minor);
    setEditX(b.position.x);
    setEditZ(b.position.z);
  };

  const saveEdit = (id: string) => {
    setBeacons(
      beacons.map((b) =>
        b.id === id
          ? {
              ...b,
              name: editName,
              minor: Number(editMinor),
              position: { x: Number(editX), z: Number(editZ) },
            }
          : b
      )
    );
    setEditingId(null);
  };

  const handleAddBeacon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBeaconName.trim()) return;
    const newB = {
      id: `beacon-${Date.now()}`,
      name: newBeaconName.trim(),
      uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
      major: 10001,
      minor: Number(newBeaconMinor),
      txPower: -59,
      floor: Number(newBeaconFloor),
      position: { x: Number(newBeaconX), z: Number(newBeaconZ) },
    };
    setBeacons([...beacons, newB]);
    setNewBeaconName('');
    setNewBeaconMinor(newB.minor + 1);
    setBleStatusText(`✅ Đã thêm Beacon mới: ${newB.name} (Minor: ${newB.minor})`);
    setActiveTab('beacons');
  };

  const handleDeleteBeacon = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa Beacon này?')) {
      setBeacons(beacons.filter((b) => b.id !== id));
    }
  };

  const filteredBeacons = useMemo(() => {
    return beacons
      .filter((b) => b.floor === currentFloor)
      .filter((b) => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return b.name.toLowerCase().includes(q) || String(b.minor).includes(q);
      });
  }, [beacons, currentFloor, searchFilter]);

  return (
    <div style={styles.shell}>
      <header style={{
        ...styles.topNav,
        padding: isMobile ? '0 12px' : '0 24px',
        height: isMobile ? 54 : 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
          <div style={{ ...styles.logoBadge, width: isMobile ? 30 : 36, height: isMobile ? 30 : 36 }}>
            <img src="/logo.png" alt="Logo" style={{ width: isMobile ? 22 : 28, height: isMobile ? 22 : 28, objectFit: 'contain' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...styles.appName, fontSize: isMobile ? 14 : 16 }}>INMAP 7A</span>
              <span style={styles.adminPill}>ADMIN</span>
            </div>
            {!isMobile && <div style={styles.hospitalText}>Bệnh Viện Quân Y 7A • Quản Trị Hạ Tầng BLE & Bản Đồ 3D</div>}
          </div>
        </div>

        {!isMobile ? (
          <div style={styles.statusChips}>
            {/* Nút Bật Room Builder Dựng Tường / Phòng trực tiếp */}
            <button
              type="button"
              onClick={toggleBuilderMode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 10,
                background: builderMode ? '#0284c7' : 'rgba(56, 189, 248, 0.15)',
                color: '#ffffff',
                border: builderMode ? '1.5px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.35)',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: builderMode ? '0 0 16px rgba(56, 189, 248, 0.4)' : 'none',
              }}
              title="Click các điểm trên sàn để vẽ tường & tạo phòng mới"
            >
              <span>{builderMode ? 'Đang vẽ tường...' : 'Vẽ tường / Tạo phòng'}</span>
              {builderPoints.length > 0 && (
                <span style={{
                  padding: '1px 6px',
                  borderRadius: 8,
                  background: '#ef4444',
                  fontSize: 10,
                }}>
                  {builderPoints.length} điểm
                </span>
              )}
            </button>

            <div style={styles.chipDivider} />
            <div style={styles.chipItem}>
              <span style={{ color: '#60a5fa' }}>📡 Beacons:</span>
              <strong>{beacons.length} mốc</strong>
            </div>
            <div style={styles.chipDivider} />
            <div style={styles.chipItem}>
              <span style={{ color: '#34d399' }}>🟢 Đang bắt:</span>
              <strong>{activeBeaconMinor ? `Minor ${activeBeaconMinor}` : 'Chưa có'}</strong>
            </div>
            <div style={styles.chipDivider} />
            <div style={styles.chipItem}>
              <span style={{ color: '#f59e0b' }}>📍 Vị trí:</span>
              <strong>{userPosition ? `X:${userPosition.x.toFixed(1)} Z:${userPosition.z.toFixed(1)}` : 'Đang đợi'}</strong>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setMobileView(mobileView === 'sidebar' ? 'map' : 'sidebar')}
              style={{
                padding: '5px 10px',
                borderRadius: 8,
                background: mobileView === 'map' ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.1)',
                border: mobileView === 'map' ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
                color: mobileView === 'map' ? '#38bdf8' : '#ffffff',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {mobileView === 'sidebar' ? '🗺 Xem Bản Đồ' : '⚙ Cấu Hình'}
            </button>
          </div>
        )}

        <button
          onClick={() => {
            window.location.pathname = '/';
          }}
          style={{
            ...styles.exitBtn,
            padding: isMobile ? '6px 10px' : '8px 16px',
            fontSize: isMobile ? 11 : 12,
          }}
          title="Thoát khỏi trang quản trị về chế độ xem người dùng"
        >
          <span>✕</span>
          {!isMobile && <span>Thoát Admin</span>}
        </button>
      </header>

      <div style={{
        ...styles.mainLayout,
        flexDirection: 'row',
      }}>
        <aside style={{
          ...styles.sidebar,
          width: isMobile ? '100%' : 440,
          display: isMobile && mobileView !== 'sidebar' ? 'none' : 'flex',
        }}>
          <div style={styles.floorTabs}>
            {floors.map((f) => (
              <button
                key={f.id}
                onClick={() => setCurrentFloor(f.id)}
                style={{
                  ...styles.floorBtn,
                  ...(currentFloor === f.id ? styles.floorBtnActive : {}),
                }}
              >
                {f.id === 0 ? 'Tầng Trệt' : `Tầng ${f.id}`}
              </button>
            ))}

            {/* Nút Thêm Tầng Mới */}
            <button
              onClick={() => {
                const maxFloorId = floors.length > 0 ? Math.max(...floors.map((f) => f.id)) : 1;
                setNewFloorNumber(maxFloorId + 1);
                setNewFloorName(`Tầng ${maxFloorId + 1} — Khu Khám Bệnh & Chuyên Khoa`);
                setNewFloorImage('');
                setShowAddFloorModal(true);
              }}
              style={{
                ...styles.floorBtn,
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px dashed #38bdf8',
                fontWeight: 700,
              }}
              title="Thêm tầng mới cho bệnh viện"
            >
              + Thêm Tầng
            </button>
          </div>

          <div style={styles.subTabs}>
            <button
              onClick={() => setActiveTab('rooms')}
              style={{
                ...styles.subTabBtn,
                ...(activeTab === 'rooms' ? styles.subTabBtnActive : {}),
              }}
            >
              Phòng ({rooms.filter((r) => r.floor === currentFloor).length})
            </button>
            <button
              onClick={() => setActiveTab('beacons')}
              style={{
                ...styles.subTabBtn,
                ...(activeTab === 'beacons' ? styles.subTabBtnActive : {}),
              }}
            >
              Beacons ({filteredBeacons.length})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              style={{
                ...styles.subTabBtn,
                ...(activeTab === 'add' ? styles.subTabBtnActive : {}),
              }}
            >
              Thêm Mới
            </button>
            <button
              onClick={() => setActiveTab('scanner')}
              style={{
                ...styles.subTabBtn,
                ...(activeTab === 'scanner' ? styles.subTabBtnActive : {}),
              }}
            >
              Quét & USB
            </button>
          </div>

          <div style={styles.tabContent}>
            {activeTab === 'rooms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="Tìm kiếm phòng..."
                  value={roomSearchFilter}
                  onChange={(e) => setRoomSearchFilter(e.target.value)}
                  style={styles.searchInput}
                />

                <div style={{ fontSize: 11, color: '#94a3b8', padding: '2px 4px' }}>
                  Tên phòng sửa tại đây sẽ <strong>đồng bộ ngay lập tức</strong> sang giao diện tìm kiếm và dẫn đường.
                </div>

                {/* Nút hành động nhanh: Bắt đầu vẽ phòng cho tầng này */}
                <button
                  type="button"
                  onClick={toggleBuilderMode}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: builderMode ? '#0284c7' : 'rgba(56, 189, 248, 0.15)',
                    color: '#ffffff',
                    border: builderMode ? '1.5px solid #38bdf8' : '1px solid rgba(56, 189, 248, 0.3)',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: builderMode ? '0 0 16px rgba(56, 189, 248, 0.35)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{builderMode ? 'Đang chế độ vẽ tường (Click sàn)' : '+ Vẽ tường & tạo phòng mới'}</span>
                </button>

                {rooms.filter((r) => r.floor === currentFloor).length === 0 && (
                  <div style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 14,
                    border: '1px dashed rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                      Tầng {currentFloor} hiện chưa có phòng nào!
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', maxWidth: 280, lineHeight: 1.5 }}>
                      Bấm nút <strong>"+ Vẽ tường & tạo phòng mới"</strong> ở trên, sau đó click các điểm góc trên mặt sàn để tự động dựng tường 3D và đục cửa.
                    </div>
                  </div>
                )}

                {rooms
                  .filter((r) => r.floor === currentFloor)
                  .filter((r) =>
                    r.name.toLowerCase().includes(roomSearchFilter.toLowerCase()) ||
                    r.description?.toLowerCase().includes(roomSearchFilter.toLowerCase())
                  )
                  .map((r) => {
                    const isEditing = editingRoomId === r.id;
                    return (
                      <div
                        key={r.id}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: 'rgba(255, 255, 255, 0.04)',
                          border: isEditing ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isEditing ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.04em' }}>
                                CHỈNH SỬA THÔNG TIN PHÒNG
                              </span>
                              <span style={{ fontSize: 11, color: '#64748b' }}>
                                ID: {r.id}
                              </span>
                            </div>

                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                                Tên phòng hiển thị
                              </label>
                              <input
                                type="text"
                                value={editingRoomName}
                                onChange={(e) => setEditingRoomName(e.target.value)}
                                placeholder="Nhập tên phòng..."
                                style={{
                                  ...styles.formInput,
                                  borderColor: 'rgba(56, 189, 248, 0.4)',
                                  background: 'rgba(15, 23, 42, 0.6)',
                                }}
                                autoFocus
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                                Mô tả / Chức năng
                              </label>
                              <input
                                type="text"
                                value={editingRoomDesc}
                                onChange={(e) => setEditingRoomDesc(e.target.value)}
                                placeholder="Mô tả chức năng phòng..."
                                style={styles.formInput}
                              />
                            </div>

                            {/* Cấu hình cửa & tường 3D */}
                            <div style={{
                              padding: 12,
                              borderRadius: 10,
                              background: 'rgba(15, 23, 42, 0.45)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 10,
                            }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.03em' }}>
                                CẤU HÌNH TƯỜNG & CỬA 3D
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                                  Hướng mở cửa
                                </label>
                                <select
                                  value={editingDoorSide}
                                  onChange={(e) => setEditingDoorSide(e.target.value)}
                                  style={{ ...styles.formSelect, width: '100%' }}
                                >
                                  <option value="auto">Tự động (theo cạnh dài nhất)</option>
                                  <option value="north">Hướng Bắc (phía trên)</option>
                                  <option value="south">Hướng Nam (phía dưới)</option>
                                  <option value="east">Hướng Đông (bên phải)</option>
                                  <option value="west">Hướng Tây (bên trái)</option>
                                  <option value="none">Tường kín (không mở cửa)</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                                  Kiểu tường
                                </label>
                                <select
                                  value={editingNoWall ? 'true' : 'false'}
                                  onChange={(e) => setEditingNoWall(e.target.value === 'true')}
                                  style={{ ...styles.formSelect, width: '100%' }}
                                >
                                  <option value="false">Tường tiêu chuẩn (dựng tường quanh phòng)</option>
                                  <option value="true">Sảnh mở / Không gian thông (không dựng tường)</option>
                                </select>
                              </div>

                              <div>
                                <label style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                                  Màu tường phòng
                                </label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <input
                                    type="color"
                                    value={editingWallColor}
                                    onChange={(e) => setEditingWallColor(e.target.value)}
                                    style={{
                                      width: 40,
                                      height: 32,
                                      padding: 0,
                                      border: '1px solid rgba(255, 255, 255, 0.2)',
                                      borderRadius: 6,
                                      cursor: 'pointer',
                                      background: 'transparent',
                                    }}
                                  />
                                  <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 600 }}>
                                    {editingWallColor.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingRoomName.trim()) {
                                    updateRoom(r.id, {
                                      name: editingRoomName.trim(),
                                      description: editingRoomDesc.trim(),
                                      doorSide: editingDoorSide as 'north' | 'south' | 'east' | 'west' | 'none' | 'auto',
                                      noWall: editingNoWall,
                                      color: editingWallColor,
                                    });
                                  }
                                  setEditingRoomId(null);
                                }}
                                style={{
                                  flex: 1,
                                  padding: '9px 14px',
                                  borderRadius: 8,
                                  background: '#2563eb',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                                  transition: 'background 0.15s ease',
                                }}
                              >
                                Lưu thay đổi
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingRoomId(null)}
                                style={{
                                  padding: '9px 16px',
                                  borderRadius: 8,
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: '#94a3b8',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  fontSize: 12,
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                Hủy
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.name}
                              </div>
                              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {r.description || 'Chưa có mô tả'}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingRoomId(r.id);
                                setEditingRoomName(r.name);
                                setEditingRoomDesc(r.description || '');
                                setEditingDoorSide(r.doorSide || 'auto');
                                setEditingNoWall(Boolean(r.noWall));
                                setEditingWallColor(r.color || '#38bdf8');
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '6px 12px',
                                borderRadius: 10,
                                background: 'rgba(56, 189, 248, 0.15)',
                                color: '#38bdf8',
                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                                flexShrink: 0,
                              }}
                            >
                              Sửa
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {activeTab === 'beacons' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  type="text"
                  placeholder="🔍 Tìm theo tên hoặc Minor ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  style={styles.searchInput}
                />

                {filteredBeacons.length === 0 ? (
                  <div style={styles.emptyCard}>
                    Chưa có Beacon nào được kết nối ở Tầng {currentFloor}.
                    <br />
                    Hãy chuyển sang tab <strong>"⚡ Quét & USB"</strong> để bắt sóng thiết bị ngoài đời!
                  </div>
                ) : (
                  filteredBeacons.map((b) => {
                    const isActive = activeBeaconMinor === b.minor;
                    const isEditing = editingId === b.id;

                    if (isEditing) {
                      return (
                        <div key={b.id} style={styles.editCard}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#facc15', marginBottom: 8 }}>
                            ✏ Sửa Mốc Beacon
                          </div>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Tên vị trí"
                            style={styles.editInput}
                          />
                          <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
                            <input
                              type="number"
                              value={editMinor}
                              onChange={(e) => setEditMinor(Number(e.target.value))}
                              placeholder="Minor"
                              style={{ ...styles.editInput, flex: 1 }}
                              title="Minor ID"
                            />
                            <input
                              type="number"
                              step="0.5"
                              value={editX}
                              onChange={(e) => setEditX(Number(e.target.value))}
                              placeholder="X"
                              style={{ ...styles.editInput, flex: 1 }}
                              title="Tọa độ X"
                            />
                            <input
                              type="number"
                              step="0.5"
                              value={editZ}
                              onChange={(e) => setEditZ(Number(e.target.value))}
                              placeholder="Z"
                              style={{ ...styles.editInput, flex: 1 }}
                              title="Tọa độ Z"
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => saveEdit(b.id)} style={styles.btnSave}>
                              Lưu Thay Đổi
                            </button>
                            <button onClick={() => setEditingId(null)} style={styles.btnCancel}>
                              Hủy
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={b.id}
                        style={{
                          ...styles.beaconCard,
                          borderColor: isActive ? '#10b981' : 'rgba(255, 255, 255, 0.08)',
                          background: isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={styles.minorTag}>M:{b.minor}</span>
                            <div style={styles.beaconName}>{b.name}</div>
                          </div>
                          {isActive && <span style={styles.liveTag}>LIVE</span>}
                        </div>

                        <div style={styles.beaconMetaRow}>
                          <span style={styles.coordText}>
                            Tọa độ: <strong>({b.position.x}, {b.position.z})</strong>
                          </span>
                          <span style={{ color: '#64748b' }}>•</span>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Tầng {b.floor}</span>
                        </div>

                        <div style={styles.beaconActions}>
                          <button
                            onClick={() => simulateNearestBeacon(b.minor)}
                            style={styles.btnTrigger}
                            title="Mô phỏng kích hoạt mốc này"
                          >
                            ▶ Phát Sóng Thử
                          </button>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => startEdit(b)} style={styles.btnIconEdit} title="Sửa">
                              ✏
                            </button>
                            <button
                              onClick={() => handleDeleteBeacon(b.id)}
                              style={styles.btnIconDelete}
                              title="Xóa"
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'add' && (
              <form onSubmit={handleAddBeacon} style={styles.addForm}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>
                  ➕ Cấu Hình Mốc Phát Sóng Mới
                </div>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px' }}>
                  Gán thiết bị Beacon vào vị trí thực tế trên sàn nhà hoặc trần tầng {currentFloor}.
                </p>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Tên Mốc Vị Trí</label>
                  <input
                    type="text"
                    placeholder="VD: Cửa Phòng Cấp Cứu, Cụm Thang Máy..."
                    value={newBeaconName}
                    onChange={(e) => setNewBeaconName(e.target.value)}
                    style={styles.formInput}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Minor ID</label>
                    <input
                      type="number"
                      min="1"
                      max="65535"
                      placeholder="VD: 1, 2, 10..."
                      value={newBeaconMinor}
                      onChange={(e) => setNewBeaconMinor(e.target.value === '' ? '' : Number(e.target.value))}
                      style={styles.formInput}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Tầng Đặt</label>
                    <select
                      value={newBeaconFloor}
                      onChange={(e) => setNewBeaconFloor(Number(e.target.value))}
                      style={styles.formSelect}
                    >
                      {floors.map((f) => (
                        <option key={f.id} value={f.id}>
                          Tầng {f.id} ({f.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Tọa Độ X</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newBeaconX}
                      onChange={(e) => setNewBeaconX(e.target.value === '' ? '' : Number(e.target.value))}
                      style={styles.formInput}
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>Tọa Độ Z</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newBeaconZ}
                      onChange={(e) => setNewBeaconZ(e.target.value === '' ? '' : Number(e.target.value))}
                      style={styles.formInput}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>Gợi Ý Tọa Độ Theo Phòng</label>
                  <select
                    onChange={(e) => {
                      const r = rooms.find((rm) => rm.id === e.target.value);
                      if (r) {
                        setNewBeaconName(`Mốc — ${r.name}`);
                        setNewBeaconX(r.center.x);
                        setNewBeaconZ(r.center.z);
                      }
                    }}
                    style={styles.formSelect}
                  >
                    <option value="">-- Chọn phòng để lấy tọa độ tự động --</option>
                    {rooms
                      .filter((r) => r.floor === currentFloor)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.center.x}, {r.center.z})
                        </option>
                      ))}
                  </select>
                </div>

                <button type="submit" style={styles.btnSubmit}>
                  + Xác Nhận Thêm Mốc Beacon
                </button>
              </form>
            )}

            {activeTab === 'scanner' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                  ⚡ Giao Tiếp Phần Cứng iBeacon
                </div>

                <div style={styles.hardwareCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🔌</span>
                    <strong style={{ fontSize: 13 }}>Nạp Cấu Hình Từng Beacon Qua USB</strong>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px' }}>
                    Mỗi module phần cứng BLE khi cắm USB cần nạp 1 ID Minor riêng biệt để hệ thống phân biệt được vị trí.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                      Chọn Beacon cần nạp cho thiết bị đang cắm:
                    </label>
                    <select
                      value={selectedUsbMinor}
                      onChange={(e) => setSelectedUsbMinor(Number(e.target.value))}
                      style={{
                        padding: '8px 10px',
                        background: '#1e293b',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 8,
                        color: '#facc15',
                        fontSize: 12,
                        fontWeight: 700,
                        outline: 'none',
                      }}
                    >
                      {beacons.map((b) => (
                        <option key={b.id} value={b.minor}>
                          Minor {b.minor} — {b.name} (Tầng {b.floor})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={async () => {
                      setBleStatusText(`Đang mở cổng COM để nạp Minor=${selectedUsbMinor}...`);
                      const success = await activateBeaconViaUsbRunInRam(
                        (log) => setBleStatusText(log),
                        selectedUsbMinor
                      );
                      if (success) simulateNearestBeacon(selectedUsbMinor);
                    }}
                    style={styles.btnUsb}
                  >
                    🔌 Cắm USB & Nạp Minor {selectedUsbMinor} Vào RAM
                  </button>
                </div>

                <div style={styles.hardwareCard}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>📶</span>
                    <strong style={{ fontSize: 13 }}>Tự Động Bắt Sóng Thực Tế (Web Bluetooth)</strong>
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px' }}>
                    Không cần cố định danh sách: Mọi Beacon phát sóng xung quanh sẽ tự động hiển thị ngay khi bắt được tín hiệu!
                  </p>
                  <button
                    onClick={async () => {
                      if (isBleScanning) {
                        setBleScanning(false);
                        setBleStatusText('Đã dừng quét Bluetooth');
                        return;
                      }
                      setBleStatusText('Đang quét sóng iBeacon...');
                      const success = await startWebBleBeaconScanner((minor, rssi) => {
                        setDiscoveredBeacons((prev) => {
                          const next = new Map(prev);
                          next.set(minor, { minor, rssi, lastSeen: Date.now() });
                          return next;
                        });

                        const state = useMapStore.getState();
                        const existing = state.beacons.find((b) => b.minor === minor);
                        if (!existing) {
                          const newB = {
                            id: `beacon-auto-${minor}`,
                            name: `Beacon Tự Nhận Diện ${minor}`,
                            uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825',
                            major: 10001,
                            minor: minor,
                            txPower: -59,
                            floor: state.currentFloor,
                            position: { x: 20 + (minor % 5) * 3, z: 20 + (minor % 3) * 4 },
                          };
                          state.setBeacons([...state.beacons, newB]);
                        }

                        setBleStatusText(`Bắt được Beacon Minor: ${minor} | RSSI: ${rssi} dBm`);
                        simulateNearestBeacon(minor);
                      });
                      if (success) setBleScanning(true);
                    }}
                    style={isBleScanning ? styles.btnBleActive : styles.btnBle}
                  >
                    {isBleScanning ? '⏹ Dừng Quét Bluetooth' : '⚡ Bắt Đầu Quét Tự Động (Auto-Discover)'}
                  </button>

                  {discoveredBeacons.size > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 6 }}>
                        📡 Đã phát hiện {discoveredBeacons.size} Beacon ngoài đời:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                        {Array.from(discoveredBeacons.values()).map((item) => (
                          <div
                            key={item.minor}
                            onClick={() => simulateNearestBeacon(item.minor)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 10px',
                              background: 'rgba(56, 189, 248, 0.1)',
                              border: '1px solid rgba(56, 189, 248, 0.25)',
                              borderRadius: 8,
                              cursor: 'pointer',
                            }}
                          >
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                              🟢 Minor {item.minor}
                            </span>
                            <span style={{ fontSize: 11, color: '#38bdf8' }}>
                              RSSI: {item.rssi} dBm
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {bleStatusText && (
                  <div style={styles.statusBox}>
                    <span style={styles.livePulse} />
                    <span>{bleStatusText}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        <main style={{
          ...styles.mapContainer,
          display: isMobile && mobileView !== 'map' ? 'none' : 'block',
        }}>
          <MapCanvas />
          {/* Bảng công cụ vẽ phòng Room Builder trực tiếp trong Admin */}
          <RoomListManager />
        </main>
      </div>

      {/* Modal Popup Thêm Tầng Mới */}
      {showAddFloorModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => setShowAddFloorModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 440,
              background: '#0f172a',
              borderRadius: 24,
              border: '1px solid rgba(255, 255, 255, 0.16)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
              padding: '24px 22px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🏢</span>
                <strong style={{ fontSize: 16, color: '#f8fafc' }}>Thêm Tầng & Bản Đồ Mới</strong>
              </div>
              <button
                type="button"
                onClick={() => setShowAddFloorModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  color: '#cbd5e1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  SỐ TẦNG (FLOOR NUMBER)
                </label>
                <input
                  type="number"
                  value={newFloorNumber}
                  onChange={(e) => setNewFloorNumber(Number(e.target.value))}
                  style={styles.formInput}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  TÊN TẦNG HIỂN THỊ
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tầng 2 — Khoa Ngoại & Hồi Sức Cấp Cứu..."
                  value={newFloorName}
                  onChange={(e) => setNewFloorName(e.target.value)}
                  style={styles.formInput}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                  HÌNH ẢNH SƠ ĐỒ / BẢN ĐỒ MẶT BẰNG 2D (TÙY CHỌN)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setNewFloorImage(event.target?.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    padding: '8px 0',
                    cursor: 'pointer',
                  }}
                />
                {newFloorImage && (
                  <div style={{ marginTop: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', height: 90 }}>
                    <img src={newFloorImage} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => {
                  if (floors.some((f) => f.id === newFloorNumber)) {
                    alert(`Tầng ${newFloorNumber} đã tồn tại! Vui lòng chọn số tầng khác.`);
                    return;
                  }
                  const newFloorObj = {
                    id: newFloorNumber,
                    name: newFloorName.trim() || `Tầng ${newFloorNumber}`,
                    planImageUrl: newFloorImage || undefined,
                    width: 40,
                    depth: 48.1,
                  };
                  addFloor(newFloorObj);
                  setShowAddFloorModal(false);
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: 14,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✓ Tạo Tầng Mới
              </button>
              <button
                type="button"
                onClick={() => setShowAddFloorModal(false)}
                style={{
                  padding: '12px 18px',
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#cbd5e1',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#090d16',
    overflow: 'hidden',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#f8fafc',
  },
  topNav: {
    height: 60,
    background: 'rgba(15, 23, 42, 0.95)',
    backdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    zIndex: 1000,
    flexShrink: 0,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  appName: {
    fontSize: 16,
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.2px',
  },
  adminPill: {
    fontSize: 10,
    fontWeight: 800,
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#ffffff',
    padding: '2px 8px',
    borderRadius: 6,
    letterSpacing: '0.5px',
  },
  hospitalText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  statusChips: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'rgba(0, 0, 0, 0.35)',
    padding: '6px 16px',
    borderRadius: 20,
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  chipItem: {
    fontSize: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  chipDivider: {
    width: 1,
    height: 14,
    background: 'rgba(255, 255, 255, 0.1)',
  },
  exitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 12,
    background: '#ef4444',
    color: '#ffffff',
    border: 'none',
    boxShadow: 'none',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  },
  mainLayout: {
    flex: 1,
    display: 'flex',
    position: 'relative',
    overflow: 'hidden',
  },
  sidebar: {
    width: 440,
    height: '100%',
    background: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(28px)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    flexShrink: 0,
  },
  floorTabs: {
    display: 'flex',
    padding: '12px 14px 6px',
    gap: 6,
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  floorBtn: {
    flex: 1,
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  floorBtnActive: {
    background: '#3b82f6',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
  },
  subTabs: {
    display: 'flex',
    padding: '8px 14px',
    gap: 6,
    background: 'rgba(0, 0, 0, 0.2)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  subTabBtn: {
    flex: 1,
    padding: '7px 4px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 8,
    cursor: 'pointer',
  },
  subTabBtnActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    color: '#38bdf8',
  },
  tabContent: {
    flex: 1,
    overflowY: 'auto',
    padding: 14,
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 4,
  },
  emptyCard: {
    padding: 20,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748b',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    border: '1px dashed rgba(255, 255, 255, 0.1)',
  },
  beaconCard: {
    padding: 12,
    borderRadius: 14,
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    transition: 'all 0.2s',
  },
  minorTag: {
    padding: '2px 6px',
    borderRadius: 6,
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 800,
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  beaconName: {
    fontSize: 13,
    fontWeight: 700,
    color: '#f8fafc',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 220,
  },
  liveTag: {
    fontSize: 9,
    fontWeight: 800,
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.2)',
    padding: '2px 6px',
    borderRadius: 6,
    border: '1px solid rgba(16, 185, 129, 0.4)',
  },
  beaconMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  coordText: {
    fontSize: 11,
    color: '#93c5fd',
  },
  beaconActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  },
  btnTrigger: {
    padding: '5px 10px',
    borderRadius: 8,
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnIconEdit: {
    padding: '5px 8px',
    borderRadius: 8,
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38bdf8',
    fontSize: 11,
    cursor: 'pointer',
  },
  btnIconDelete: {
    padding: '5px 8px',
    borderRadius: 8,
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    fontSize: 11,
    cursor: 'pointer',
  },
  editCard: {
    padding: 12,
    borderRadius: 14,
    background: 'rgba(234, 179, 8, 0.1)',
    border: '1px solid rgba(234, 179, 8, 0.3)',
  },
  editInput: {
    width: '100%',
    padding: '6px 8px',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 11,
    outline: 'none',
    boxSizing: 'border-box',
  },
  btnSave: {
    flex: 1,
    padding: '6px',
    background: '#10b981',
    border: 'none',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnCancel: {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    color: '#94a3b8',
    fontSize: 11,
    cursor: 'pointer',
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  formInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 13,
    outline: 'none',
  },
  formSelect: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '9px 12px',
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: '#ffffff',
    fontSize: 12,
    outline: 'none',
  },
  btnSubmit: {
    padding: '11px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: 12,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 6,
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
  },
  hardwareCard: {
    padding: 12,
    borderRadius: 14,
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  btnUsb: {
    width: '100%',
    padding: '9px',
    background: 'rgba(234, 179, 8, 0.16)',
    color: '#facc15',
    border: '1px solid rgba(234, 179, 8, 0.4)',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnBle: {
    width: '100%',
    padding: '9px',
    background: 'rgba(56, 189, 248, 0.16)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnBleActive: {
    width: '100%',
    padding: '9px',
    background: 'rgba(16, 185, 129, 0.25)',
    color: '#34d399',
    border: '1px solid #10b981',
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnToggle3D: {
    padding: '6px 12px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 8,
    color: '#cbd5e1',
    fontSize: 11,
    cursor: 'pointer',
  },
  statusBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    background: 'rgba(56, 189, 248, 0.1)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: 10,
    color: '#38bdf8',
    fontSize: 12,
  },
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#38bdf8',
    boxShadow: '0 0 8px #38bdf8',
  },
  mapContainer: {
    flex: 1,
    height: '100%',
    position: 'relative',
  },
  mapFloatingTip: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    background: 'rgba(15, 23, 42, 0.88)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    padding: '8px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    color: '#cbd5e1',
    pointerEvents: 'none',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  },
};
