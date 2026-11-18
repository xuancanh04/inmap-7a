import { voiceService } from '../utils/voiceGuidanceService';
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
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
          width: 'calc(100% - 24px)',
          maxWidth: 440,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 20,
          boxShadow: '0 8px 28px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          animation: 'slideDown 0.2s ease-out',
        }}
      >
        {/* Nút Back quay lại bản đồ bình thường và thoát chọn phòng */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearNavigation();
            setSelectedRoomId(null);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            clearNavigation();
            setSelectedRoomId(null);
          }}
          title="Quay lại bản đồ"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
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
                background: '#0284c7',
                boxShadow: '0 0 6px rgba(2, 132, 199, 0.5)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Vị trí của bạn
            </span>
          </div>

          <div style={{ width: '100%', height: '1px', background: 'rgba(0, 0, 0, 0.06)' }} />

          {/* Tầng 2: Điểm đến */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 6px rgba(239, 68, 68, 0.5)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedRoom?.name || 'Điểm đến đã chọn'}
            </span>
          </div>
        </div>

        {/* Nút đóng / hủy lộ trình */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            clearNavigation();
            setSelectedRoomId(null);
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            clearNavigation();
            setSelectedRoomId(null);
          }}
          title="Đóng lộ trình"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#f1f5f9',
            border: 'none',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 700,
            flexShrink: 0,
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
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
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: 'calc(100% - 24px)',
        maxWidth: 480,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* 1 Thanh tìm kiếm duy nhất - Phong cách Google Maps hiện đại sáng rõ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 24,
          padding: '8px 16px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Icon Kính Lúp Vector Google Maps cao cấp */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(2, 132, 199, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

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
                color: '#0f172a',
                background: 'transparent',
                padding: '2px 0',
              }}
            />
          </div>
          <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
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
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              color: '#64748b',
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
            background: 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: 20,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            maxHeight: 'min(50vh, 320px)',
            overflowY: 'auto',
            padding: '6px 0',
          }}
        >
          {suggestions.length === 0 ? (
            <div style={{ padding: '14px 18px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              Không tìm thấy phòng ở Lầu 1
            </div>
          ) : (
            suggestions.map((r: Room) => (
              <div
                key={r.id}
                onClick={() => {
                  setSelectedRoomId(r.id);
                  voiceService.speak(`Đã chọn ${r.name}`);
                  setSearchText('');
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: 'rgba(2, 132, 199, 0.1)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
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
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.description || 'Khu vực khám chữa bệnh Lầu 1'}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: '#0284c7' }}>➔</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
