import { useMemo } from 'react';
import { useMapStore } from '../store/useMapStore';

export function GoogleMapsBottomCard() {
  const selectedRoomId = useMapStore((s) => s.selectedRoomId);
  const setSelectedRoomId = useMapStore((s) => s.setSelectedRoomId);
  const rooms = useMapStore((s) => s.rooms);
  const navNodes = useMapStore((s) => s.navNodes);
  const userPosition = useMapStore((s) => s.userPosition);
  const navigateToRoom = useMapStore((s) => s.navigateToRoom);
  const triggerRecenterUser = useMapStore((s) => s.triggerRecenterUser);
  const setIsNavigatingActive = useMapStore((s) => s.setIsNavigatingActive);

  const isNavigatingActive = useMapStore((s) => s.isNavigatingActive);

  const room = useMemo(() => {
    if (!selectedRoomId) return null;
    return rooms.find((r) => r.id === selectedRoomId);
  }, [selectedRoomId, rooms]);

  // Ước tính khoảng cách từ vị trí hiện tại tới phòng đang chọn
  const estimatedInfo = useMemo(() => {
    if (!room) return { meters: 20, timeMin: 1 };
    const floorNodes = navNodes.filter((n) => n.floor === 1);
    const destNode = floorNodes.find((n) => n.roomId === room.id) ?? floorNodes[0];
    const fromPos = userPosition ?? floorNodes.find((n) => n.id !== destNode?.id)?.position;
    if (!fromPos || !destNode) return { meters: 25, timeMin: 1 };
    const dist = Math.hypot(destNode.position.x - fromPos.x, destNode.position.z - fromPos.z);
    const meters = Math.max(5, Math.round(dist * 1.25));
    const timeMin = Math.max(1, Math.ceil(meters / 45)); // Tốc độ đi bộ trung bình ~45m/phút
    return { meters, timeMin };
  }, [room, navNodes, userPosition]);

  // Khi đang điều hướng (bấm Bắt đầu) thì ẩn Bottom Card này
  if (!room || isNavigatingActive) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99998,
        display: 'flex',
        justifyContent: 'center',
        padding: '0 12px max(14px, env(safe-area-inset-bottom, 14px))',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'rgba(15, 23, 42, 0.94)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderRadius: 24,
          boxShadow: '0 24px 64px -10px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.14)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          padding: '12px 18px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'auto',
          color: '#f8fafc',
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        {/* Nẹp kéo drag bar nhỏ chuẩn mobile */}
        <div style={{ width: 42, height: 4, background: 'rgba(255, 255, 255, 0.25)', borderRadius: 2, margin: '0 auto 4px' }} />

        {/* Khối Header: Icon + Tên phòng + Ước tính khoảng cách/thời gian + Nút Đóng */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
            {/* Khối huy hiệu Icon y tế */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(37, 99, 235, 0.25) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              🏥
            </div>

            {/* Tên phòng & các nhãn thông tin phụ */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#ffffff',
                    margin: 0,
                    lineHeight: 1.25,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {room.name}
                </h2>
              </div>

              {/* Dòng tóm tắt lộ trình: ~2 phút (85m) • Lầu 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                <span style={{ color: '#38bdf8', fontWeight: 700 }}>
                  ~{estimatedInfo.timeMin} phút
                </span>
                <span style={{ color: '#cbd5e1' }}>({estimatedInfo.meters}m)</span>
                <span>•</span>
                <span style={{ background: 'rgba(56, 189, 248, 0.14)', color: '#7dd3fc', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '1px 6px', borderRadius: 6, fontWeight: 700, fontSize: 10 }}>
                  Lầu 1
                </span>
              </div>
            </div>
          </div>

          {/* Nút đóng thẻ ✕ */}
          <button
            type="button"
            onClick={() => setSelectedRoomId(null)}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Khối mô tả phòng tinh gọn */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.28)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: 14,
            padding: '8px 12px',
            fontSize: 12,
            color: '#cbd5e1',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#34d399', fontSize: 10, flexShrink: 0 }}>●</span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {room.description || 'Khu vực khám chữa bệnh và điều trị chuyên khoa BV Quân y 7A.'}
          </span>
        </div>

        {/* Cụm 2 nút hành động lớn chuẩn Google Maps Navigation: Đường Đi (Cyan / Blue Glass) & Bắt Đầu (Electric Emerald) */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {/* Nút Đường Đi: Nền xanh lá cây phẳng (#16a34a / Emerald), chữ và icon trắng, không bóng */}
          <button
            type="button"
            onClick={() => {
              navigateToRoom(room.id);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 22,
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            {/* Icon chỉ đường rẽ phải màu trắng chuẩn Google Maps viewBox 24x24 cân đối */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M5 19v-6a4 4 0 0 1 4-4h9" />
              <polyline points="15 5 19 9 15 13" />
            </svg>
            <span>Đường đi</span>
          </button>

          {/* Nút Bắt Đầu: Bật chế độ chỉ dẫn trực tiếp, căn góc theo vị trí người dùng (không tự động chạy mô phỏng) */}
          <button
            type="button"
            onClick={() => {
              setIsNavigatingActive(true);
              navigateToRoom(room.id);
              triggerRecenterUser();
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 22,
              padding: '11px 16px',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            {/* Icon SVG Start Navigation chuẩn Turn-by-Turn */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2L4 21l8-4 8 4L12 2z" />
            </svg>
            <span>Bắt đầu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
