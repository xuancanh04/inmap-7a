import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Line, Html } from '@react-three/drei';
import { useMapStore } from '../store/useMapStore';

export function RoomBuilderOverlay() {
  const builderMode = useMapStore((s) => s.builderMode);
  const builderPoints = useMapStore((s) => s.builderPoints);
  const updateBuilderPoint = useMapStore((s) => s.updateBuilderPoint);
  const removeBuilderPoint = useMapStore((s) => s.removeBuilderPoint);

  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Đoạn nối các điểm mốc
  const linePoints = useMemo(() => {
    if (builderPoints.length < 2) return [];
    const pts = builderPoints.map((p) => new THREE.Vector3(p.x, 0.2, p.z));

    if (builderPoints.length >= 3) {
      pts.push(new THREE.Vector3(builderPoints[0].x, 0.2, builderPoints[0].z));
    }
    return pts;
  }, [builderPoints]);

  // Khối 3D đa giác preview
  const previewGeometry = useMemo(() => {
    if (builderPoints.length < 3) return null;
    try {
      const shape = new THREE.Shape();
      const [first, ...rest] = builderPoints;
      shape.moveTo(first.x, first.z);
      for (const p of rest) {
        shape.lineTo(p.x, p.z);
      }
      shape.closePath();

      return new THREE.ExtrudeGeometry(shape, {
        depth: 2.2,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.04,
      });
    } catch {
      return null;
    }
  }, [builderPoints]);

  if (!builderMode) return null;

  return (
    <group>
      {/* Vùng vô hình nhận sự kiện drag khi đang kéo điểm mốc trên mặt phẳng sàn y=0 */}
      {draggingIdx !== null && (
        <mesh
          position={[0, 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onPointerMove={(e) => {
            e.stopPropagation();
            if (draggingIdx === null) return;
            const pt = e.point;
            if (pt) {
              const newCoord = {
                x: Math.round(pt.x * 10) / 10,
                z: Math.round(pt.z * 10) / 10,
              };
              updateBuilderPoint(draggingIdx, newCoord);
            }
          }}
          onPointerUp={(e) => {
            e.stopPropagation();
            setDraggingIdx(null);
          }}
        >
          <planeGeometry args={[500, 500]} />
          <meshBasicMaterial visible={false} />
        </mesh>
      )}

      {/* Hiển thị các điểm mốc góc phòng */}
      {builderPoints.map((p, idx) => {
        const isDraggingThis = draggingIdx === idx;

        return (
          <group key={`bp-${idx}`} position={[p.x, 0.25, p.z]}>
            {/* Điểm hình cầu 3D tương tác kéo thả */}
            <mesh
              onPointerDown={(e) => {
                e.stopPropagation();
                setDraggingIdx(idx);
              }}
            >
              <sphereGeometry args={[isDraggingThis ? 0.42 : 0.32, 24, 24]} />
              <meshStandardMaterial
                color={isDraggingThis ? '#f59e0b' : idx === 0 ? '#10b981' : '#0284c7'}
                emissive={isDraggingThis ? '#f59e0b' : idx === 0 ? '#10b981' : '#0284c7'}
                emissiveIntensity={0.8}
                roughness={0.2}
              />
            </mesh>

            {/* Vòng tròn định vị dưới sàn */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0]}>
              <ringGeometry args={[0.38, 0.58, 28]} />
              <meshBasicMaterial
                color={isDraggingThis ? '#f59e0b' : '#38bdf8'}
                transparent
                opacity={0.75}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Thẻ số thứ tự + nút xóa nhanh điểm đó */}
            <Html
              position={[0, 0.65, 0]}
              center
              distanceFactor={20}
              style={{
                pointerEvents: 'auto',
                userSelect: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  background: isDraggingThis
                    ? 'rgba(245, 158, 11, 0.95)'
                    : 'rgba(15, 23, 42, 0.88)',
                  backdropFilter: 'blur(8px)',
                  color: '#ffffff',
                  padding: '2px 6px',
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 700,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
                  border: isDraggingThis
                    ? '1.5px solid #ffffff'
                    : '1px solid rgba(56, 189, 248, 0.5)',
                  cursor: 'grab',
                  whiteSpace: 'nowrap',
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setDraggingIdx(idx);
                }}
              >
                <span>#{idx + 1}</span>
                <span style={{ fontSize: 9, opacity: 0.85 }}>({p.x}, {p.z})</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBuilderPoint(idx);
                  }}
                  title={`Xóa điểm #${idx + 1}`}
                  style={{
                    marginLeft: 2,
                    background: 'rgba(239, 68, 68, 0.3)',
                    border: 'none',
                    color: '#f87171',
                    borderRadius: '50%',
                    width: 14,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 9,
                    fontWeight: 'bold',
                  }}
                >
                  ✕
                </button>
              </div>
            </Html>
          </group>
        );
      })}

      {/* Đường nối các góc */}
      {linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color="#38bdf8"
          lineWidth={3.5}
          dashed={false}
        />
      )}

      {/* Khối xem trước tường 3D khi nối từ 3 điểm trở lên */}
      {previewGeometry && (
        <mesh
          geometry={previewGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.3}
            roughness={0.2}
            metalness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}
