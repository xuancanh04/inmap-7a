import { useMemo, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { Grid } from '@react-three/drei';
import { useMapStore } from '../store/useMapStore';

interface FloorPlanProps {
  width: number;
  depth: number;
  adminMode?: boolean;
  builderMode?: boolean;
  floorId?: number;
}

export function FloorPlan({
  width,
  depth,
  adminMode = false,
  builderMode = false,
  floorId = 1,
}: FloorPlanProps) {
  const addClickedCoord = useMapStore((s) => s.addClickedCoord);
  const addBuilderPoint = useMapStore((s) => s.addBuilderPoint);
  const meshRef = useRef<THREE.Mesh>(null);
  const [lastClick, setLastClick] = useState<{ x: number; z: number } | null>(null);

  const centerX = useMemo(() => width / 2, [width]);
  const centerZ = useMemo(() => depth / 2, [depth]);

  const handleFloorClick = useCallback(
    (event: THREE.Event & { point?: THREE.Vector3 }) => {
      if (!adminMode && !builderMode) return;

      const point = (event as unknown as { point: THREE.Vector3 }).point;
      if (!point) return;

      const coord = {
        x: Math.round(point.x * 10) / 10,
        z: Math.round(point.z * 10) / 10,
      };

      if (builderMode) {
        addBuilderPoint(coord);
        return;
      }

      if (adminMode) {
        setLastClick(coord);
        addClickedCoord(coord);

        const coordStr = `{ x: ${coord.x}, z: ${coord.z} }`;
        navigator.clipboard
          .writeText(coordStr)
          .catch(() => {});
      }
    },
    [adminMode, builderMode, addClickedCoord, addBuilderPoint]
  );

  const floorBaseColor = floorId === 0 ? '#f8fafc' : floorId === 2 ? '#f0f9ff' : '#ffffff';
  const floorBorderColor = '#e2e8f0';
  const gridCellColor = '#e2e8f0';
  const gridSectionColor = '#cbd5e1';

  return (
    <group>
      {/* Viền đế sàn ngoài */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.06, centerZ]}
      >
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial color={floorBorderColor} side={THREE.DoubleSide} />
      </mesh>

      {/* Mặt sàn chính màu trắng tinh tế */}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.02, centerZ]}
        receiveShadow
        onClick={handleFloorClick}
      >
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          color={floorBaseColor}
          side={THREE.DoubleSide}
          roughness={0.2}
          metalness={0.02}
        />
      </mesh>

      {/* Lưới tọa độ Grid màu xám nhạt nhẹ nhàng */}
      <Grid
        position={[centerX, -0.01, centerZ]}
        args={[width, depth]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={gridCellColor}
        sectionSize={5}
        sectionThickness={0.8}
        sectionColor={gridSectionColor}
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Điểm click trong Admin mode */}
      {adminMode && lastClick && (
        <group position={[lastClick.x, 0.2, lastClick.z]}>
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ff6b6b" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
            <ringGeometry args={[0.4, 0.6, 32]} />
            <meshBasicMaterial
              color="#ff6b6b"
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
}
export default FloorPlan;
