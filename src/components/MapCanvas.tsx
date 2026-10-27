// ============================================================================
// InMap 7A — MapCanvas.tsx
// Canvas 3D chính: Camera, Controls, Ánh sáng, và lắp ráp các component 3D
// ============================================================================

import { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { FloorPlan } from './FloorPlan';
import { RoomManager } from './RoomManager';
import { NavPath } from './NavPath';
import { RoomBuilderOverlay } from './RoomBuilderOverlay';
import { MultiFloorBuilding } from './MultiFloorBuilding';
import { BeaconLayer } from './BeaconLayer';
import { useMapStore } from '../store/useMapStore';

/**
 * Điều khiển Camera thông minh:
 * Khi có lộ trình dẫn đường (navigation.path):
 * - Tự động lướt mượt mà (smooth lerp) đưa góc nhìn vào trung tâm lộ trình
 * - Phóng to vừa vặn toàn bộ cung đường và phòng đích để bệnh nhân nhìn rõ lối đi
 */
function NavigationCameraController({
  controlsRef,
  floorCenter,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  floorCenter: [number, number, number];
}) {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);

  // Tính góc hướng đi và vị trí camera chuẩn Google Maps (Đứng từ sau lưng người dùng nhìn thẳng về phía trước theo hướng đi)
  const navBounds = useMemo(() => {
    if (path.length < 2) return null;
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const pts = path.map((id) => nodeMap.get(id)).filter(Boolean);
    if (pts.length < 2 || !pts[0] || !pts[1]) return null;

    const start = pts[0].position;
    // Lấy hướng của 1 hoặc 2 đoạn đầu tiên để biết người dùng cần bước tới đâu
    const next = pts[1].position;
    const dest = pts[pts.length - 1]!.position;

    // Vector hướng đi ban đầu
    const dx = next.x - start.x;
    const dz = next.z - start.z;
    const dirLen = Math.hypot(dx, dz) || 1;
    const normDirX = dx / dirLen;
    const normDirZ = dz / dirLen;

    // Tổng độ dài toàn cung đường
    let totalSpan = Math.hypot(dest.x - start.x, dest.z - start.z);
    totalSpan = Math.max(totalSpan, 12);

    // Điểm ngắm (Look-at target): Ngắm vào phía trước người dùng khoảng 5-8 mét trên lộ trình
    const targetX = start.x + normDirX * Math.min(totalSpan * 0.45, 8);
    const targetZ = start.z + normDirZ * Math.min(totalSpan * 0.45, 8);

    // Vị trí Camera kiểu Google Maps: Đứng lùi lại phía sau lưng người dùng và nâng cao lên góc 45 độ
    // Camera ở vị trí (Start - Hướng đi * khoảng_cách_lùi)
    const camDistanceBehind = Math.min(totalSpan * 0.55, 14);
    const camHeight = Math.max(Math.min(totalSpan * 0.85, 22), 12);

    const camX = start.x - normDirX * camDistanceBehind;
    const camZ = start.z - normDirZ * camDistanceBehind;

    return {
      center: new THREE.Vector3(targetX, 0, targetZ),
      camPos: new THREE.Vector3(camX, camHeight, camZ),
    };
  }, [path, navNodes]);

  const targetLerp = useRef(new THREE.Vector3(...floorCenter));
  const isNavigating = useRef(false);

  useEffect(() => {
    if (navBounds) {
      targetLerp.current.copy(navBounds.center);
      isNavigating.current = true;
    } else {
      targetLerp.current.set(...floorCenter);
      isNavigating.current = false;
    }
  }, [navBounds, floorCenter]);

  const isSimulatingWalk = useMapStore((s) => s.isSimulatingWalk);
  const userPosition = useMapStore((s) => s.userPosition);
  const deviceHeading = useMapStore((s) => s.deviceHeading);

  useFrame(({ camera }) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Khi người dùng đang bước đi mô phỏng
    if (isSimulatingWalk && userPosition) {
      const headingRad = THREE.MathUtils.degToRad(deviceHeading ?? 0);
      const forwardX = Math.sin(headingRad);
      const forwardZ = Math.cos(headingRad);

      const targetPos = new THREE.Vector3(userPosition.x + forwardX * 4, 0, userPosition.z + forwardZ * 4);
      controls.target.lerp(targetPos, 0.1);

      const desiredCamPos = new THREE.Vector3(
        userPosition.x - forwardX * 8,
        14,
        userPosition.z - forwardZ * 8
      );
      camera.position.lerp(desiredCamPos, 0.08);
    } else {
      // Lướt mượt mà target của OrbitControls về phía trước mặt người dùng theo hướng đi
      controls.target.lerp(targetLerp.current, 0.08);

      // Khi vừa bấm tìm đường: Lướt camera về phía sau lưng người dùng nhìn tới phía trước
      if (isNavigating.current && navBounds) {
        camera.position.lerp(navBounds.camPos, 0.07);
        if (camera.position.distanceTo(navBounds.camPos) < 0.25) {
          isNavigating.current = false; // Đã xoay đúng góc nhìn phía trước mặt, nhường lại quyền tự do xoay zoom cho người dùng
        }
      }
    }

    controls.update();
  });


  return null;
}

/**
 * Component Canvas 3D chính.
 * - Camera perspective nhìn từ góc isometric.
 * - OrbitControls cho phép xoay 360°, zoom, kéo bản đồ mượt mà.
 * - Hệ thống ánh sáng: ambient + directional.
 */
export function MapCanvas() {
  const currentFloor = useMapStore((s) => s.currentFloor);
  const floors = useMapStore((s) => s.floors);
  const adminMode = useMapStore((s) => s.adminMode);
  const builderMode = useMapStore((s) => s.builderMode);
  const building3DMode = useMapStore((s) => s.building3DMode);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const activeFloor = useMemo(
    () => floors.find((f) => f.id === currentFloor),
    [floors, currentFloor]
  );

  // Tọa độ trung tâm sàn → target cho camera
  const floorCenter = useMemo(() => {
    if (!activeFloor) return [22, 0, 12] as [number, number, number];
    return [
      activeFloor.width / 2,
      0,
      activeFloor.depth / 2,
    ] as [number, number, number];
  }, [activeFloor]);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]} // Giới hạn pixel ratio 1.5x để đảm bảo mượt mà 60fps trên mọi màn hình
      camera={{
        position: [floorCenter[0] + 30, 35, floorCenter[2] + 30],
        fov: 45,
        near: 0.1,
        far: 500,
      }}
      style={{
        width: '100%',
        height: '100%',
        touchAction: 'none',
        background: 'radial-gradient(circle at 50% 30%, #1e293b 0%, #0f172a 60%, #080d1a 100%)',
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
    >
      <Suspense fallback={null}>
        {/* ── Hệ thống ánh sáng y tế cao cấp, ấm áp và rõ nét khối 3D ── */}
        <ambientLight intensity={0.85} color="#ffffff" />
        <directionalLight
          position={[35, 50, 30]}
          intensity={1.3}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={140}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
        />
        {/* Ánh sáng phụ màu xanh ngọc nhẹ tạo cảm giác hiện đại */}
        <directionalLight
          position={[-30, 30, -25]}
          intensity={0.5}
          color="#38bdf8"
        />
        {/* Fill light từ dưới lên để các hốc phòng và cửa không bị tối đen */}
        <directionalLight
          position={[0, -20, 0]}
          intensity={0.15}
          color="#94a3b8"
        />

        {/* ── Fog tinh tế tạo chiều sâu vô cực ── */}
        <fog attach="fog" args={['#080d1a', 70, 150]} />

        {/* ── Môi trường thành phố đêm dịu mắt ── */}
        <Environment preset="city" />

        {/* ── Chế độ Toàn Cảnh Ghép 3 Tầng hoặc Xem Từng Tầng Đơn Lẻ ── */}
        {building3DMode ? (
          <MultiFloorBuilding
            width={activeFloor?.width ?? 40}
            depth={activeFloor?.depth ?? 48.1}
          />
        ) : (
          <>
            {/* Mặt sàn đơn lẻ */}
            {activeFloor && (
              <FloorPlan
                width={activeFloor.width}
                depth={activeFloor.depth}
                adminMode={adminMode}
                builderMode={builderMode}
                floorId={currentFloor}
              />
            )}
            {/* Các phòng của tầng hiện tại */}
            <RoomManager wallHeight={2.8} />
          </>
        )}

        {/* ── Room Builder 3D Overlay (Đỉnh, viền & khối preview 3D) ── */}
        <RoomBuilderOverlay />

        {/* ── Đường dẫn đường ── */}
        <NavPath />

        {/* ── Lớp hiển thị mốc sóng BLE Beacon (DFRobot Gravity) ── */}
        <BeaconLayer />

        {/* ── Bộ điều hướng Camera tự động lia mượt mà theo lộ trình tìm đường ── */}
        <NavigationCameraController
          controlsRef={controlsRef}
          floorCenter={floorCenter}
        />

        {/* ── Controls: Xoay 360° tự do, Zoom, Pan mượt mà trên cả Desktop & Cảm ứng Mobile ── */}
        <OrbitControls
          ref={controlsRef}
          target={floorCenter}
          enableDamping
          dampingFactor={0.06}
          minDistance={5}
          maxDistance={120}
          maxPolarAngle={Math.PI / 2.05} // Cho phép nhìn ngang mặt sàn nhưng không chìm dưới sàn
          minPolarAngle={0.05}           // Cho phép nhìn từ đỉnh đầu (Top-down 90°)
          enableRotate={true}
          rotateSpeed={0.8}
          enableZoom={true}
          zoomSpeed={1.0}
          enablePan={true}
          panSpeed={0.8}
          touches={{
            ONE: 1, // TOUCH.ROTATE - 1 ngón xoay bản đồ 3D
            TWO: 2, // TOUCH.DOLLY_PAN - 2 ngón zoom & kéo dịch chuyển bản đồ
          }}
        />
      </Suspense>
    </Canvas>
  );
}
