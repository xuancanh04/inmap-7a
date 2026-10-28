import React, { useState, useEffect } from 'react';
import { useMapStore } from '../store/useMapStore';

export function MapControlBar() {
  const cameraRotationAngle = useMapStore((s) => s.cameraRotationAngle);
  const triggerResetNorth = useMapStore((s) => s.triggerResetNorth);
  const isFollowingUser = useMapStore((s) => s.isFollowingUser);
  const setIsFollowingUser = useMapStore((s) => s.setIsFollowingUser);
  const triggerRecenterUser = useMapStore((s) => s.triggerRecenterUser);
  const triggerZoomIn = useMapStore((s) => s.triggerZoomIn);
  const triggerZoomOut = useMapStore((s) => s.triggerZoomOut);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      style={{
        ...styles.container,
        ...(isMobile ? styles.containerMobile : {}),
      }}
    >
      {/* 1. NÚT LA BÀN GOOGLE MAPS */}
      <button
        type="button"
        onClick={triggerResetNorth}
        title="Nhấn để xoay bản đồ về hướng Bắc"
        style={styles.compassBtn}
      >
        <div
          style={{
            transform: `rotate(${-cameraRotationAngle}deg)`,
            transition: 'transform 0.15s ease-out',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
          }}
        >
          {/* Kim đỏ hướng Bắc */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '11px solid #ef4444',
            }}
          />
          {/* Kim xám hướng Nam */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '11px solid #94a3b8',
            }}
          />
        </div>
      </button>

      {/* 2. NÚT TÂM ĐỊNH VỊ (TỰ ĐỘNG BÁM THEO VỊ TRÍ) */}
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
        {/* Biểu tượng tâm ngắm GPS chuẩn Google Maps */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" />
          <polyline points="12 2 12 5" />
          <polyline points="12 19 12 22" />
          <polyline points="2 12 5 12" />
          <polyline points="19 12 22 12" />
          {isFollowingUser && <circle cx="12" cy="12" r="3" fill="#3b82f6" />}
        </svg>
      </button>

      {/* 3. CỤM NÚT PHÓNG TO / THU NHỎ (+ / -) */}
      <div style={styles.zoomGroup}>
        <button
          type="button"
          onClick={triggerZoomIn}
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
          title="Thu nhỏ bản đồ"
          style={styles.zoomBtnBottom}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    zIndex: 900,
  },
  containerMobile: {
    right: 14,
    bottom: 'auto',
    top: 76,
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

