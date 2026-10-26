// ============================================================================
// InMap 7A — CoordHUD.tsx
// HUD hiển thị tọa độ click (Admin Tool) ở góc dưới phải màn hình
// ============================================================================

import { useCallback } from 'react';
import { useMapStore } from '../store/useMapStore';
import type { Point2D } from '../types';

/**
 * Bảng HUD nhỏ ở góc dưới phải hiển thị:
 * - Tọa độ click gần nhất
 * - Lịch sử các điểm đã click (tối đa 20 điểm)
 * - Nút copy all / clear
 */
export function CoordHUD() {
  const adminMode = useMapStore((s) => s.adminMode);
  const clickedCoords = useMapStore((s) => s.clickedCoords);
  const clearClickedCoords = useMapStore((s) => s.clearClickedCoords);
  const removeClickedCoord = useMapStore((s) => s.removeClickedCoord);

  const lastCoord = clickedCoords.length > 0
    ? clickedCoords[clickedCoords.length - 1]
    : null;

  // Copy tất cả tọa độ dưới dạng JSON array
  const handleCopyAll = useCallback(() => {
    const formatted = clickedCoords
      .map((c: Point2D) => `  { x: ${c.x}, z: ${c.z} }`)
      .join(',\n');
    const text = `[\n${formatted}\n]`;
    navigator.clipboard.writeText(text).catch(() => {});
    console.log('📋 [Admin Tool] Đã copy tất cả tọa độ:\n' + text);
  }, [clickedCoords]);

  // Copy một tọa độ
  const handleCopyOne = useCallback((coord: Point2D) => {
    const text = `{ x: ${coord.x}, z: ${coord.z} }`;
    navigator.clipboard.writeText(text).catch(() => {});
  }, []);

  if (!adminMode) return null;

  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.pulse} />
          <span style={styles.headerTitle}>📐 Admin — Click Tọa độ</span>
        </div>
        <span style={styles.badge}>{clickedCoords.length}</span>
      </div>

      {/* ── Tọa độ hiện tại ── */}
      <div style={styles.currentCoord}>
        {lastCoord ? (
          <>
            <div style={styles.coordLabel}>Điểm vừa click:</div>
            <div style={styles.coordValues}>
              <span style={styles.coordAxis}>
                X: <strong style={styles.coordNum}>{lastCoord.x}</strong>
              </span>
              <span style={styles.coordDivider}>│</span>
              <span style={styles.coordAxis}>
                Z: <strong style={styles.coordNum}>{lastCoord.z}</strong>
              </span>
            </div>
          </>
        ) : (
          <div style={styles.placeholder}>
            Click vào bản đồ để lấy tọa độ...
          </div>
        )}
      </div>

      {/* ── Danh sách lịch sử ── */}
      {clickedCoords.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.historyHeader}>
            <span style={styles.historyTitle}>Lịch sử điểm</span>
            <div style={styles.historyActions}>
              <button onClick={handleCopyAll} style={styles.btnSmall} title="Copy tất cả">
                📋 Copy All
              </button>
              <button onClick={clearClickedCoords} style={styles.btnSmallDanger} title="Xóa tất cả">
                🗑
              </button>
            </div>
          </div>

          <div style={styles.historyList}>
            {[...clickedCoords].reverse().map((coord, idx) => (
              <div key={`${coord.x}-${coord.z}-${idx}`} style={styles.historyItem}>
                <span style={styles.historyIndex}>
                  {clickedCoords.length - idx}
                </span>
                <span style={styles.historyCoord}>
                  ({coord.x}, {coord.z})
                </span>
                <div style={styles.historyItemActions}>
                  <button
                    onClick={() => handleCopyOne(coord)}
                    style={styles.btnTiny}
                    title="Copy"
                  >
                    📋
                  </button>
                  <button
                    onClick={() => removeClickedCoord(clickedCoords.length - 1 - idx)}
                    style={styles.btnTiny}
                    title="Xóa"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer hint ── */}
      <div style={styles.footer}>
        💡 Tọa độ tự động copy vào clipboard khi click
      </div>
    </div>
  );
}

// ── Styles ──
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 300,
    background:
      'linear-gradient(180deg, rgba(15,15,26,0.95) 0%, rgba(20,20,40,0.92) 100%)',
    backdropFilter: 'blur(20px)',
    borderRadius: 14,
    border: '1px solid rgba(255,107,107,0.2)',
    boxShadow:
      '0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(255,107,107,0.08)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    zIndex: 100,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ff6b6b',
    boxShadow: '0 0 8px #ff6b6b',
    animation: 'none', // CSS animation would need @keyframes
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.3px',
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    color: '#ff6b6b',
    background: 'rgba(255,107,107,0.15)',
    padding: '2px 8px',
    borderRadius: 10,
  },
  currentCoord: {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  coordLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: 6,
  },
  coordValues: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  coordAxis: {
    fontSize: 14,
    color: '#94a3b8',
  },
  coordNum: {
    fontSize: 18,
    fontWeight: 700,
    color: '#ff6b6b',
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
  },
  coordDivider: {
    color: '#334155',
    fontSize: 16,
  },
  placeholder: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  historySection: {
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  historyHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px 6px',
  },
  historyTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  historyActions: {
    display: 'flex',
    gap: 4,
  },
  historyList: {
    maxHeight: 160,
    overflowY: 'auto',
    padding: '0 16px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 8px',
    background: 'rgba(255,255,255,0.02)',
    borderRadius: 6,
    fontSize: 12,
  },
  historyIndex: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'rgba(255,107,107,0.12)',
    color: '#ff6b6b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  },
  historyCoord: {
    flex: 1,
    fontFamily: "'Consolas', monospace",
    color: '#94a3b8',
    fontSize: 12,
  },
  historyItemActions: {
    display: 'flex',
    gap: 2,
  },
  btnSmall: {
    padding: '3px 8px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.04)',
    color: '#94a3b8',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  btnSmallDanger: {
    padding: '3px 6px',
    border: '1px solid rgba(255,107,107,0.2)',
    borderRadius: 5,
    background: 'rgba(255,107,107,0.08)',
    color: '#ff6b6b',
    fontSize: 10,
    cursor: 'pointer',
    fontFamily: "'Inter', sans-serif",
  },
  btnTiny: {
    padding: '2px 4px',
    border: 'none',
    borderRadius: 3,
    background: 'transparent',
    color: '#64748b',
    fontSize: 10,
    cursor: 'pointer',
    lineHeight: 1,
  },
  footer: {
    padding: '8px 16px',
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
  },
};
