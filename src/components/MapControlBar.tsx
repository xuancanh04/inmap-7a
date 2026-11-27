import React, { useState, useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';

export function MapControlBar() {
  const isFollowingUser = useMapStore((s) => s.isFollowingUser);
  const setIsFollowingUser = useMapStore((s) => s.setIsFollowingUser);
  const triggerRecenterUser = useMapStore((s) => s.triggerRecenterUser);
  const triggerZoomIn = useMapStore((s) => s.triggerZoomIn);
  const triggerZoomOut = useMapStore((s) => s.triggerZoomOut);
  const selectedRoomId = useMapStore((s) => s.selectedRoomId);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Các tầng hiển thị nhỏ gọn: L2, L1, G
  const availableFloors = [
    { id: 2, label: 'L2', title: 'Lầu 2' },
    { id: 1, label: 'L1', title: 'Lầu 1' },
    { id: 0, label: 'G', title: 'Tầng trệt' },
  ];

  return (
    <>
      {/* Cụm nút chọn tầng bên cạnh trái màn hình chuẩn Google Maps */}
      <div
        style={{
          ...styles.floorContainer,
          ...(isMobile ? styles.floorContainerMobile : {}),
        }}
      >
        <div style={styles.floorGroup}>
          {availableFloors.map((fl, idx) => {
            const isActive = currentFloor === fl.id;
            return (
              <React.Fragment key={fl.id}>
                {idx > 0 && <div style={styles.divider} />}
                <button
                  type="button"
                  onClick={() => setCurrentFloor(fl.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  title={fl.title}
                  style={{
                    ...styles.floorBtn,
                    backgroundColor: isActive ? '#0284c7' : '#ffffff',
                    color: isActive ? '#ffffff' : '#334155',
                    fontWeight: isActive ? 800 : 600,
                  }}
                >
                  {fl.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Cụm nút điều khiển bản đồ ở cạnh phải (Định vị, Phóng to/Thu nhỏ) */}
      <div
        style={{
          ...styles.container,
          ...(isMobile ? styles.containerMobile : {}),
          ...(isMobile && selectedRoomId ? { bottom: 175 } : {}),
        }}
      >
        {/* Nút định vị & bám theo vị trí người dùng */}
        <button
        type="button"
        onClick={() => {
          if (isFollowingUser) {
            setIsFollowingUser(false);
          } else {
            triggerRecenterUser();
          }
        }}
        title={isFollowingUser ? 'Đang tự bám theo vị trí (Bấm để hủy)' : 'Định vị & tự bám theo bước chân'}
        style={{
          ...styles.iconBtn,
          color: isFollowingUser ? '#3b82f6' : '#64748b',
          backgroundColor: isFollowingUser ? '#eff6ff' : '#ffffff',
          borderColor: isFollowingUser ? '#60a5fa' : 'rgba(0, 0, 0, 0.08)',
          boxShadow: isFollowingUser ? '0 0 0 2px rgba(59, 130, 246, 0.25)' : styles.iconBtn.boxShadow,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <polyline points="12 2 12 5" />
          <polyline points="12 19 12 22" />
          <polyline points="2 12 5 12" />
          <polyline points="19 12 22 12" />
          {isFollowingUser && <circle cx="12" cy="12" r="3" fill="#3b82f6" />}
        </svg>
      </button>

      <div style={styles.zoomGroup}>
        <button
          type="button"
          onClick={triggerZoomIn}
          onPointerDown={(e) => e.stopPropagation()}
          title="Phóng to bản đồ"
          style={styles.zoomBtnTop}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <div style={styles.divider} />
        <button
          type="button"
          onClick={triggerZoomOut}
          onPointerDown={(e) => e.stopPropagation()}
          title="Thu nhỏ bản đồ"
          style={styles.zoomBtnBottom}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  </>
);
}

const styles: Record<string, React.CSSProperties> = {
  floorContainer: {
    position: 'absolute',
    left: 18,
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 900,
  },
  floorContainerMobile: {
    left: 14,
    top: '45%',
    transform: 'translateY(-50%)',
    zIndex: 9999,
  },
  container: {
    position: 'absolute',
    right: 18,
    bottom: 30,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    zIndex: 900,
  },
  containerMobile: {
    right: 14,
    bottom: 110,
    top: 'auto',
    zIndex: 9999,
  },
  compassBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.15s ease',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    border: '1px solid rgba(0, 0, 0, 0.1)',
    transition: 'all 0.15s ease',
  },
  zoomGroup: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  floorGroup: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid rgba(0, 0, 0, 0.1)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  floorBtn: {
    width: 44,
    height: 36,
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  zoomBtnTop: {
    width: 44,
    height: 40,
    backgroundColor: '#ffffff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  zoomBtnBottom: {
    width: 44,
    height: 40,
    backgroundColor: '#ffffff',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    width: '100%',
  },
};
