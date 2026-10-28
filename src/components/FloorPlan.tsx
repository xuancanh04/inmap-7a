import { useMemo, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { useMapStore } from '../store/useMapStore';

const FLOOR_PLAN_IMAGE_URL = '/anh 2dd.jpg';

const IMAGE_WIDTH = 2129;
const IMAGE_HEIGHT = 2560;
const IMAGE_ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT;

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

  const textureDimensions = useMemo(() => {
    const boxAspect = width / depth;

    let planeW: number;
    let planeD: number;

    if (IMAGE_ASPECT > boxAspect) {

      planeW = width;
      planeD = width / IMAGE_ASPECT;
    } else {

      planeD = depth;
      planeW = depth * IMAGE_ASPECT;
    }

    return { planeW, planeD };
  }, [width, depth]);

  const texture = useLoader(THREE.TextureLoader, FLOOR_PLAN_IMAGE_URL, (loader) => {

    loader.crossOrigin = 'anonymous';
  });

  useMemo(() => {
    if (!texture) return;
    Object.assign(texture, {
      colorSpace: THREE.SRGBColorSpace,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
      anisotropy: 16,
      generateMipmaps: true,
      needsUpdate: true,
    });
  }, [texture]);

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
        console.log(`📐 [Room Builder] Thêm đỉnh: { x: ${coord.x}, z: ${coord.z} }`);
        return;
      }

      if (adminMode) {
        setLastClick(coord);
        addClickedCoord(coord);

        const coordStr = `{ x: ${coord.x}, z: ${coord.z} }`;
        console.log(`📍 [Admin Tool] Tọa độ click: ${coordStr}`);

        navigator.clipboard
          .writeText(coordStr)
          .then(() => console.log('   ✅ Đã copy vào clipboard!'))
          .catch(() => console.log('   ⚠️ Không thể copy clipboard'));
      }
    },
    [adminMode, builderMode, addClickedCoord, addBuilderPoint]
  );

  const isLightFloor = true;
  const floorBaseColor = floorId === 0 ? '#f8fafc' : floorId === 2 ? '#f0f9ff' : '#f8fafc';
  const floorBorderColor = '#cbd5e1';
  const gridCellColor = '#cbd5e1';
  const gridSectionColor = '#94a3b8';

  return (
    <group>
      {}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.06, centerZ]}
      >
        <planeGeometry args={[width + 4.4, depth + 4.4]} />
        <meshBasicMaterial color={floorBorderColor} side={THREE.DoubleSide} />
      </mesh>

      {}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.05, centerZ]}
        receiveShadow
      >
        <planeGeometry args={[width + 4, depth + 4]} />
        <meshStandardMaterial
          color={floorBaseColor}
          side={THREE.DoubleSide}
          roughness={isLightFloor ? 0.2 : 0.8}
          metalness={isLightFloor ? 0.05 : 0}
        />
      </mesh>

      {}
      {floorId === 1 && (
        <mesh
          ref={meshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[centerX, -0.02, centerZ]}
          receiveShadow
          onClick={handleFloorClick}
        >
          <planeGeometry
            args={[textureDimensions.planeW, textureDimensions.planeD]}
          />
          <meshStandardMaterial
            map={texture}
            side={THREE.DoubleSide}
            transparent
            opacity={0.88}
            roughness={0.8}
            metalness={0}
          />
        </mesh>
      )}

      {}
      {isLightFloor && (
        <mesh
          ref={meshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[centerX, -0.02, centerZ]}
          receiveShadow
          onClick={handleFloorClick}
        >
          <planeGeometry
            args={[textureDimensions.planeW, textureDimensions.planeD]}
          />
          <meshStandardMaterial
            color={floorId === 0 ? '#f8fafc' : '#f0fdf4'}
            side={THREE.DoubleSide}
            roughness={0.25}
            metalness={0.08}
          />
        </mesh>
      )}

      {}
      <Grid
        position={[centerX, -0.01, centerZ]}
        args={[width + 4, depth + 4]}
        cellSize={1}
        cellThickness={isLightFloor ? 0.6 : 0.4}
        cellColor={gridCellColor}
        sectionSize={5}
        sectionThickness={isLightFloor ? 1.0 : 0.8}
        sectionColor={gridSectionColor}
        fadeDistance={80}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {}
      {adminMode && lastClick && (
        <group position={[lastClick.x, 0.2, lastClick.z]}>
          {}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ff6b6b" />
          </mesh>
          {}
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
