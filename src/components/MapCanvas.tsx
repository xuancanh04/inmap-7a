// ============================================================================
// InMap 7A — MapCanvas.tsx
// Canvas 3D chính: Camera, Controls, Ánh sáng, và lắp ráp các component 3D
// ============================================================================

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { FloorPlan } from './FloorPlan';
import { RoomManager } from './RoomManager';
import { NavPath } from './NavPath';
import { RoomBuilderOverlay } from './RoomBuilderOverlay';
import { MultiFloorBuilding } from './MultiFloorBuilding';
import { useMapStore } from '../store/useMapStore';

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
        background: 'linear-gradient(180deg, #0b0f19 0%, #111827 50%, #0f172a 100%)',
      }}
      gl={{
        antialias: true,
        powerPreference: 'high-performance',
      }}
    >
      <Suspense fallback={null}>
        {/* ── Ánh sáng kiến trúc tối ưu ── */}
        <ambientLight intensity={0.65} color="#ffffff" />
        <directionalLight
          position={[30, 45, 25]}
          intensity={1.1}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={120}
          shadow-camera-left={-40}
          shadow-camera-right={40}
          shadow-camera-top={40}
          shadow-camera-bottom={-40}
        />
        <directionalLight
          position={[-25, 25, -20]}
          intensity={0.4}
          color="#38bdf8"
        />

        {/* ── Fog nhẹ để tạo chiều sâu ── */}
        <fog attach="fog" args={['#0f0f1a', 60, 120]} />

        {/* ── Environment nhẹ ── */}
        <Environment preset="night" />

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

        {/* ── Controls: Xoay 360° tự do, Zoom, Pan mượt mà ── */}
        <OrbitControls
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
        />
      </Suspense>
    </Canvas>
  );
}
