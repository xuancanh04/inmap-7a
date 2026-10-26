// ============================================================================
// InMap 7A — FloorPlan.tsx
// Mặt sàn 3D + Bản vẽ 2D Texture nền + Lưới tham chiếu
// ============================================================================

import { useMemo, useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import { useMapStore } from '../store/useMapStore';

/** Đường dẫn ảnh bản vẽ 2D trong thư mục public */
const FLOOR_PLAN_IMAGE_URL = '/anh 2dd.jpg';

/**
 * Kích thước gốc của ảnh bản vẽ (pixels).
 * Dùng để tính toán aspect ratio chính xác → tránh méo ảnh.
 */
const IMAGE_WIDTH = 2129;
const IMAGE_HEIGHT = 2560;
const IMAGE_ASPECT = IMAGE_WIDTH / IMAGE_HEIGHT; // ≈ 0.8316

interface FloorPlanProps {
  width: number;
  depth: number;
  /** Bật/tắt chế độ Admin Tool click lấy tọa độ */
  adminMode?: boolean;
  /** Bật/tắt chế độ Visual Room Builder vẽ phòng 3D */
  builderMode?: boolean;
  /** ID tầng đang hiển thị (0: Trệt, 1: Tầng 1, 2: Tầng 2/3) */
  floorId?: number;
}

/**
 * Hiển thị mặt phẳng sàn nhà nằm ngang ở y = 0.
 * - Layer dưới cùng: Viền sàn
 * - Layer giữa: Bản vẽ 2D texture (giữ đúng aspect ratio) hoặc sàn gạch sáng
 * - Layer trên: Lưới tham chiếu
 * - Khi adminMode=true: click vào sàn → lấy tọa độ (x, z)
 */
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

  // ── Tọa độ trung tâm sàn ──
  const centerX = useMemo(() => width / 2, [width]);
  const centerZ = useMemo(() => depth / 2, [depth]);

  // ── Tính kích thước mặt phẳng texture giữ đúng aspect ratio ──
  // Fit ảnh vào trong bounding box (width × depth) mà không bị méo
  const textureDimensions = useMemo(() => {
    const boxAspect = width / depth;

    let planeW: number;
    let planeD: number;

    if (IMAGE_ASPECT > boxAspect) {
      // Ảnh rộng hơn → fit theo chiều ngang
      planeW = width;
      planeD = width / IMAGE_ASPECT;
    } else {
      // Ảnh cao hơn → fit theo chiều dọc
      planeD = depth;
      planeW = depth * IMAGE_ASPECT;
    }

    return { planeW, planeD };
  }, [width, depth]);

  // ── Load texture bản vẽ 2D ──
  const texture = useLoader(THREE.TextureLoader, FLOOR_PLAN_IMAGE_URL, (loader) => {
    // Cấu hình loader nếu cần
    loader.crossOrigin = 'anonymous';
  });

  // Gán thông số texture an toàn
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

  // ── Xử lý click trên mặt sàn ──
  const handleFloorClick = useCallback(
    (event: THREE.Event & { point?: THREE.Vector3 }) => {
      if (!adminMode && !builderMode) return;

      // Lấy tọa độ giao điểm từ raycaster
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

  // Màu nền sàn theo từng tầng — đồng bộ nền sáng sạch sẽ, tránh bị vệt đen
  const isLightFloor = true;
  const floorBaseColor = floorId === 0 ? '#f8fafc' : floorId === 2 ? '#f0f9ff' : '#f8fafc';
  const floorBorderColor = '#cbd5e1';
  const gridCellColor = '#cbd5e1';
  const gridSectionColor = '#94a3b8';

  return (
    <group>
      {/* ── Layer 1: Viền sàn (dưới cùng) ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, -0.06, centerZ]}
      >
        <planeGeometry args={[width + 4.4, depth + 4.4]} />
        <meshBasicMaterial color={floorBorderColor} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Layer 2: Mặt sàn nền gạch men (Sáng sang trọng cho Tầng Trệt & Tầng 3) ── */}
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

      {/* ── Layer 3: Bản vẽ 2D Texture (Áp dụng chính xác cho Tầng 1) ── */}
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

      {/* ── Mặt sàn tương tác click cho Tầng Trệt & Tầng 3 ── */}
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

      {/* ── Layer 4: Lưới tham chiếu kiến trúc bán trong suốt ── */}
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

      {/* ── Marker vị trí click cuối cùng (Admin Mode) ── */}
      {adminMode && lastClick && (
        <group position={[lastClick.x, 0.2, lastClick.z]}>
          {/* Cọc đánh dấu */}
          <mesh>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="#ff6b6b" />
          </mesh>
          {/* Vòng tròn dưới chân */}
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
