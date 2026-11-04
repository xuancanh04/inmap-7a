import { useState, useMemo, useRef, useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';
import type { Room } from '../types';

export function GoogleMapsSearchBar() {
  const rooms = useMapStore((s) => s.rooms);
  const selectedRoomId = useMapStore((s) => s.selectedRoomId);
  const setSelectedRoomId = useMapStore((s) => s.setSelectedRoomId);
  const path = useMapStore((s) => s.navigation.path);
  const clearNavigation = useMapStore((s) => s.clearNavigation);
  const isNavigatingActive = useMapStore((s) => s.isNavigatingActive);

  // Chỉ lấy danh sách các phòng ở Lầu 1
  const floor1Rooms = useMemo(() => rooms.filter((r) => r.floor === 1), [rooms]);
  const selectedRoom = useMemo(() => rooms.find((r) => r.id === selectedRoomId), [rooms, selectedRoomId]);

  const [searchText, setSearchText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const suggestions = useMemo(() => {
    if (!searchText.trim()) return floor1Rooms;
    const q = searchText.toLowerCase();
    return floor1Rooms.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)
    );
  }, [floor1Rooms, searchText]);

  // Nếu đang trong chế độ dẫn đường trực tiếp (Bắt đầu) thì ẩn thanh tìm kiếm
  if (isNavigatingActive) return null;

  // Khi đang ở chế độ xem lộ trình "Đường đi" (path >= 2 nhưng chưa bấm Bắt đầu)
  // Hiển thị thanh Header 2 tầng: Vị trí của bạn -> Vị trí đến (Chuẩn Google Maps)
  if (path.length >= 2) {
    return (
      <div
        style={{
          position: 'absolute',
          top: 'max(14px, env(safe-area-inset-top, 14px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          width: 'calc(100% - 24px)',
          maxWidth: 440,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          borderRadius: 20,
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.14)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'slideDown 0.2s ease-out',
        }}
      >
        {/* Nút Back quay lại tìm kiếm */}
        <button
          type="button"
          onClick={() => {
            clearNavigation();
          }}
          title="Quay lại"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* 2 Tầng: Vị trí của bạn & Điểm đến */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Tầng 1: Vị trí của bạn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Vị trí của bạn
            </span>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />

          {/* Tầng 2: Điểm đến */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedRoom?.name || 'Điểm đến đã chọn'}
            </span>
          </div>
        </div>

        {/* Nút đóng / hủy lộ trình */}
        <button
          type="button"
          onClick={() => {
            clearNavigation();
            setSelectedRoomId(null);
          }}
          title="Đóng lộ trình"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 'max(14px, env(safe-area-inset-top, 14px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: 'calc(100% - 28px)',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* 1 Thanh tìm kiếm duy nhất - Phong cách Google Maps hiện đại */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          borderRadius: 24,
          padding: '8px 16px',
          boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.14)',
          border: '1px solid rgba(255, 255, 255, 0.16)',
        }}
      >
        <span style={{ fontSize: 16, color: '#38bdf8', flexShrink: 0 }}>🔍</span>

        {/* Ô nhập tìm kiếm - Tự động điền tên phòng khi đã chọn */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="text"
              value={searchText !== '' ? searchText : (selectedRoom ? selectedRoom.name : '')}
              onFocus={() => {
                if (selectedRoom && !searchText) {
                  setSearchText(selectedRoom.name);
                }
                setIsOpen(true);
              }}
              onChange={(e) => {
                setSearchText(e.target.value);
                setIsOpen(true);
              }}
              placeholder="Tìm phòng khám, khoa bệnh..."
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: '#f8fafc',
                background: 'transparent',
                padding: '2px 0',
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>
            {selectedRoom ? (selectedRoom.description || 'Đã chọn vị trí tới • Lầu 1') : 'Bệnh Viện Quân Y 7A (Lầu 1)'}
          </div>
        </div>

        {(searchText || selectedRoom) ? (
          <button
            type="button"
            onClick={() => {
              setSearchText('');
              setSelectedRoomId(null);
              clearNavigation();
              setIsOpen(false);
            }}
            title="Xóa lựa chọn"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              color: '#cbd5e1',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {/* Khi chạm vào hoặc gõ chữ: Mới mở danh sách phòng để chọn */}
      {isOpen && (
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.96)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            borderRadius: 20,
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            maxHeight: 'min(50vh, 320px)',
            overflowY: 'auto',
            padding: '6px 0',
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ padding: '14px 18px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
              Không tìm thấy phòng ở Lầu 1
            </div>
          ) : (
            suggestions.map((r: Room) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRoomId(r.id);
                  setSearchText('');
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(56, 189, 248, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  🏥
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.description || 'Khu vực khám chữa bệnh Lầu 1'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#38bdf8' }}>➔</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
