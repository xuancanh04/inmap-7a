// ============================================================================
// InMap 7A — NavPath.tsx
// Vẽ đường dẫn đường (navigation path) trên mặt sàn 3D
// ============================================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '../store/useMapStore';

const PATH_Y = 0.15; // Nâng đường lên khỏi mặt sàn để tránh z-fighting

/**
 * Component vẽ đường dẫn đường từ origin → destination.
 * - Đường chính màu xanh lá nổi bật với animation dash.
 * - Hiển thị marker tại điểm bắt đầu và kết thúc.
 */
export function NavPath() {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);
  const markerRef = useRef<THREE.Mesh>(null);

  // Chuyển đổi mảng node IDs → mảng tọa độ 3D
  const pathPoints = useMemo(() => {
    if (path.length < 2) return [];

    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const points: [number, number, number][] = [];

    for (const nodeId of path) {
      const node = nodeMap.get(nodeId);
      if (node) {
        points.push([node.position.x, PATH_Y, node.position.z]);
      }
    }

    return points;
  }, [path, navNodes]);

  // Animation cho marker điểm đến (nhấp nháy)
  useFrame(({ clock }) => {
    if (markerRef.current && pathPoints.length > 0) {
      const t = clock.getElapsedTime();
      const scale = 1 + 0.3 * Math.sin(t * 3);
      markerRef.current.scale.set(scale, scale, scale);
    }
  });

  if (pathPoints.length < 2) return null;

  const startPoint = pathPoints[0];
  const endPoint = pathPoints[pathPoints.length - 1];

  return (
    <group>
      {/* ── Đường dẫn chính — xanh lá ── */}
      <Line
        points={pathPoints}
        color="#00ff88"
        lineWidth={4}
        dashed={false}
      />

      {/* ── Đường viền glow (halo) ── */}
      <Line
        points={pathPoints}
        color="#00ff88"
        lineWidth={8}
        transparent
        opacity={0.2}
      />

      {/* ── Marker điểm bắt đầu (hình tròn xanh dương) ── */}
      <mesh position={[startPoint[0], PATH_Y + 0.1, startPoint[2]]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>

      {/* ── Marker vị trí đích (hình tròn xanh lá nhấp nháy) ── */}
      <mesh
        ref={markerRef}
        position={[endPoint[0], PATH_Y + 0.1, endPoint[2]]}
      >
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#00ff88" />
      </mesh>

      {/* ── Vòng sóng quanh marker đích ── */}
      <mesh
        position={[endPoint[0], PATH_Y + 0.05, endPoint[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.6, 0.8, 32]} />
        <meshBasicMaterial
          color="#00ff88"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
