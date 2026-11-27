import { voiceService } from '../utils/voiceGuidanceService';
import { useMemo } from 'react';
import { useMapStore } from '../store/useMapStore';
import { summarizeRouteInstructions } from '../utils/pathfinding';

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
  const startSimulationWalk = useMapStore((s) => s.startSimulationWalk);

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
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          borderRadius: 24,
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.14), 0 1px 3px rgba(0, 0, 0, 0.05)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '12px 18px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'auto',
          color: '#0f172a',
          animation: 'slideUp 0.22s ease-out',
        }}
      >
        {/* Nẹp kéo drag bar nhỏ chuẩn mobile */}
        <div style={{ width: 42, height: 4, background: 'rgba(0, 0, 0, 0.15)', borderRadius: 2, margin: '0 auto 4px' }} />

        {/* Khối Header: Icon + Tên phòng + Ước tính khoảng cách/thời gian + Nút Đóng */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
            {/* Khối huy hiệu Icon y tế */}
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(37, 99, 235, 0.18) 100%)',
                border: '1px solid rgba(2, 132, 199, 0.25)',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)',
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
                    color: '#0f172a',
                    margin: 0,
                    lineHeight: 1.25,
                    letterSpacing: '-0.2px',
                  }}
                >
                  {room.name}
                </h2>
              </div>

              {/* Dòng tóm tắt lộ trình: ~2 phút (85m) • Lầu 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b', marginTop: 2 }}>
                <span style={{ color: '#0284c7', fontWeight: 700 }}>
                  ~{estimatedInfo.timeMin} phút
                </span>
                <span style={{ color: '#475569' }}>({estimatedInfo.meters}m)</span>
                <span>•</span>
                <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: '#0369a1', border: '1px solid rgba(2, 132, 199, 0.25)', padding: '1px 6px', borderRadius: 6, fontWeight: 700, fontSize: 10 }}>
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
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
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
            background: '#f8fafc',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            borderRadius: 14,
            padding: '8px 12px',
            fontSize: 12,
            color: '#475569',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span style={{ color: '#16a34a', fontSize: 10, flexShrink: 0 }}>●</span>
          <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {room.description || 'Khu vực khám chữa bệnh và điều trị chuyên khoa BV Quân y 7A.'}
          </span>
        </div>

        {/* Cụm 3 nút hành động chuẩn Navigation: Đường Đi, Đi Thử & Bắt Đầu */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {/* Nút Đường Đi: Xem toàn bộ tuyến đường */}
          <button
            type="button"
            onClick={() => {
              navigateToRoom(room.id);
              voiceService.speak(`Lộ trình đến ${room.name}. Khoảng cách ${estimatedInfo.meters} mét.`);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: 22,
              padding: '11px 10px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M5 19v-6a4 4 0 0 1 4-4h9" />
              <polyline points="15 5 19 9 15 13" />
            </svg>
            <span>Đường đi</span>
          </button>

          {/* Nút Đi Thử: Tự động chạy mô phỏng bước đi dọc theo hành lang */}
          <button
            type="button"
            onClick={() => {
              voiceService.unlockAudio();
              setIsNavigatingActive(true);
              navigateToRoom(room.id);
              triggerRecenterUser();
              setTimeout(() => {
                const state = useMapStore.getState();
                const speech = summarizeRouteInstructions(state.navigation.path, state.navNodes, room.name);
                voiceService.speak(speech || `Bắt đầu đi thử đến ${room.name}.`, true);
                startSimulationWalk();
              }, 400);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              borderRadius: 22,
              padding: '11px 10px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.35)',
              transition: 'opacity 0.15s ease',
            }}
          >
            <span style={{ fontSize: 15 }}>🚶</span>
            <span>Đi thử</span>
          </button>

          {/* Nút Bắt Đầu: Chế độ dẫn đường thực tế */}
          <button
            type="button"
            onClick={() => {
              voiceService.unlockAudio();
              setIsNavigatingActive(true);
              navigateToRoom(room.id);
              triggerRecenterUser();
              setTimeout(() => {
                const state = useMapStore.getState();
                const speech = summarizeRouteInstructions(state.navigation.path, state.navNodes, room.name);
                voiceService.speak(speech || `Bắt đầu dẫn đường đến ${room.name}.`, true);
              }, 400);
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: 22,
              padding: '11px 10px',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              cursor: 'pointer',
              boxShadow: 'none',
              transition: 'opacity 0.15s ease',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M12 2L4 21l8-4 8 4L12 2z" />
            </svg>
            <span>Bắt đầu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
