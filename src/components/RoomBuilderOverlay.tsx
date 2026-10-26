// ============================================================================
// InMap 7A — RoomBuilderOverlay.tsx
// Hiển thị các đỉnh đang vẽ, đường viền đa giác và khối 3D xem trước thời gian thực
// ============================================================================

import { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';
import { useMapStore } from '../store/useMapStore';

export function RoomBuilderOverlay() {
  const builderMode = useMapStore((s) => s.builderMode);
  const builderPoints = useMapStore((s) => s.builderPoints);

  // Tạo các line segments để nối các điểm đang vẽ
  const linePoints = useMemo(() => {
    if (builderPoints.length < 2) return [];
    const pts = builderPoints.map((p) => new THREE.Vector3(p.x, 0.15, p.z));
    // Nối khép kín nếu có từ 3 điểm trở lên
    if (builderPoints.length >= 3) {
      pts.push(new THREE.Vector3(builderPoints[0].x, 0.15, builderPoints[0].z));
    }
    return pts;
  }, [builderPoints]);

  // Tạo preview khối 3D bán trong suốt nếu đã có từ 3 điểm trở lên
  const previewGeometry = useMemo(() => {
    if (builderPoints.length < 3) return null;
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
  }, [builderPoints]);

  if (!builderMode) return null;

  return (
    <group>
      {/* ── Các marker tại từng đỉnh ── */}
      {builderPoints.map((p, idx) => (
        <group key={`bp-${idx}-${p.x}-${p.z}`} position={[p.x, 0.25, p.z]}>
          <mesh>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial
              color={idx === 0 ? '#00f2fe' : '#4facfe'}
              emissive={idx === 0 ? '#00f2fe' : '#4facfe'}
              emissiveIntensity={0.6}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
            <ringGeometry args={[0.3, 0.45, 24]} />
            <meshBasicMaterial
              color="#00f2fe"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}

      {/* ── Đường viền đa giác nối các đỉnh ── */}
      {linePoints.length >= 2 && (
        <Line
          points={linePoints}
          color="#00f2fe"
          lineWidth={2.5}
          dashed={false}
        />
      )}

      {/* ── Khối 3D xem trước thời gian thực (Extrude 3D) ── */}
      {previewGeometry && (
        <mesh
          geometry={previewGeometry}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color="#00f2fe"
            transparent
            opacity={0.35}
            roughness={0.2}
            metalness={0.1}
            wireframe={false}
          />
        </mesh>
      )}
    </group>
  );
}
