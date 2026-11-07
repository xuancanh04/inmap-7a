import { Suspense, useMemo, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { FloorPlan } from './FloorPlan';
import { RoomManager } from './RoomManager';
import { NavPath } from './NavPath';
import { RoomBuilderOverlay } from './RoomBuilderOverlay';
import { MultiFloorBuilding } from './MultiFloorBuilding';
import { BeaconLayer } from './BeaconLayer';
import { useMapStore } from '../store/useMapStore';

function NavigationCameraController({
  controlsRef,
  floorCenter,
}: {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  floorCenter: [number, number, number];
}) {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);
  const setCameraRotationAngle = useMapStore((s) => s.setCameraRotationAngle);
  const resetNorthTrigger = useMapStore((s) => s.resetNorthTrigger);
  const recenterUserTrigger = useMapStore((s) => s.recenterUserTrigger);
  const zoomInTrigger = useMapStore((s) => s.zoomInTrigger);
  const zoomOutTrigger = useMapStore((s) => s.zoomOutTrigger);
  const lastNorthRef = useRef(resetNorthTrigger);
  const lastRecenterRef = useRef(recenterUserTrigger);
  const lastZoomInRef = useRef(zoomInTrigger);
  const lastZoomOutRef = useRef(zoomOutTrigger);

  const navBounds = useMemo(() => {
    if (path.length < 2) return null;
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const pts = path.map((id) => nodeMap.get(id)).filter(Boolean);
    if (pts.length < 2 || !pts[0] || !pts[1]) return null;

    const start = pts[0].position;

    
    const dest = pts[pts.length - 1]!.position;

    // Đường đi hợp lệ từ start đến dest

    // Tâm đường đi thực tế giữa điểm đầu và điểm cuối
    const midX = (start.x + dest.x) / 2;
    const midZ = (start.z + dest.z) / 2;

    const spanX = Math.abs(dest.x - start.x);
    const spanZ = Math.abs(dest.z - start.z);
    const maxSpan = Math.max(spanX, spanZ, 16);

    // Tính toán khoảng cách camera vừa vặn cho màn hình điện thoại
    const isMobileScreen = typeof window !== 'undefined' && window.innerWidth <= 768;
    const heightFactor = isMobileScreen ? 1.6 : 1.25;
    const camHeight = Math.max(maxSpan * heightFactor, 26);
    const camDistZ = isMobileScreen ? camHeight * 0.75 : camHeight * 0.65;

    const camX = midX;
    const camZ = midZ + camDistZ;

    const targetX = midX;
    const targetZ = midZ;

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

  const userPosition = useMapStore((s) => s.userPosition);
  const deviceHeading = useMapStore((s) => s.deviceHeading);
  const isFollowingUser = useMapStore((s) => s.isFollowingUser);
  const [navFollowZoomOffset, setNavFollowZoomOffset] = useState<number>(0);

  useFrame(({ camera }) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // Lấy tâm quay: chỉ dùng góc nhìn góc nhìn thứ nhất (live follow) khi có vị trí thực tế hoặc bật bám theo
    const hasActiveUserTrack = Boolean(userPosition && (isFollowingUser || path.length >= 2));
    const focusCenter = hasActiveUserTrack ? userPosition : null;

    // Xử lý nút bấm Phóng to / Thu nhỏ
    if (zoomInTrigger !== lastZoomInRef.current) {
      lastZoomInRef.current = zoomInTrigger;
      // Dù đang có đường đi hay không, người dùng bấm zoom in sẽ ngắt chế độ tự căn fix camera
      isNavigating.current = false;
      if (hasActiveUserTrack) {
        setNavFollowZoomOffset((prev) => Math.max(prev - 3, -10));
      } else {
        camera.position.lerp(controls.target, 0.28);
      }
    }

    if (zoomOutTrigger !== lastZoomOutRef.current) {
      lastZoomOutRef.current = zoomOutTrigger;
      // Dù đang có đường đi hay không, người dùng bấm zoom out sẽ ngắt chế độ tự căn fix camera
      isNavigating.current = false;
      if (hasActiveUserTrack) {
        setNavFollowZoomOffset((prev) => Math.min(prev + 4, 30));
      } else {
        const dir = camera.position.clone().sub(controls.target).normalize();
        camera.position.addScaledVector(dir, 5.5);
      }
    }

    // Khi người dùng có vị trí thực và đang di chuyển
    if (hasActiveUserTrack && focusCenter) {
      // Ưu tiên góc la bàn quay điện thoại thực tế (deviceHeading) nếu có
      let headingRad = deviceHeading !== null ? THREE.MathUtils.degToRad(deviceHeading) : 0;

      // Nếu không có cảm biến la bàn, fallback theo hướng của đoạn đường đi
      if (deviceHeading === null) {
        const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
        const waypoints = path.map((id) => nodeMap.get(id)?.position).filter(Boolean);
        let bestDist = Infinity;
        let segIdx = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
          const p1 = waypoints[i]!;
          const p2 = waypoints[i + 1]!;
          const d = Math.hypot((p1.x + p2.x) / 2 - focusCenter.x, (p1.z + p2.z) / 2 - focusCenter.z);
          if (d < bestDist) {
            bestDist = d;
            segIdx = i;
          }
        }
        if (waypoints[segIdx] && waypoints[segIdx + 1]) {
          const segDx = waypoints[segIdx + 1]!.x - waypoints[segIdx]!.x;
          const segDz = waypoints[segIdx + 1]!.z - waypoints[segIdx]!.z;
          if (Math.hypot(segDx, segDz) > 0.1) {
            headingRad = Math.atan2(segDx, segDz);
          }
        }
      }

      const forwardX = Math.sin(headingRad);
      const forwardZ = Math.cos(headingRad);

      const targetPos = new THREE.Vector3(
        focusCenter.x + forwardX * 3,
        0,
        focusCenter.z + forwardZ * 3
      );
      controls.target.lerp(targetPos, 0.08);

      const baseDistance = 8;
      const baseHeight = 14;
      const zoomRatio = (baseDistance + navFollowZoomOffset) / baseDistance;
      const camDistBack = Math.max(baseDistance + navFollowZoomOffset, 3);
      const camDistHeight = Math.max(baseHeight * zoomRatio, 5);

      const desiredCamPos = new THREE.Vector3(
        focusCenter.x - forwardX * camDistBack,
        camDistHeight,
        focusCenter.z - forwardZ * camDistBack
      );
      camera.position.lerp(desiredCamPos, 0.06);
    } else {
      // Khi đang chỉ đường tổng quan (chưa có bước đi thực tế hoặc nhìn tổng quan tuyến đường)
      if (isNavigating.current && navBounds) {
        controls.target.lerp(targetLerp.current, 0.08);
        camera.position.lerp(navBounds.camPos, 0.07);
        if (camera.position.distanceTo(navBounds.camPos) < 0.25) {
          isNavigating.current = false;
        }
      }
    }

    if (resetNorthTrigger !== lastNorthRef.current) {
      lastNorthRef.current = resetNorthTrigger;
      const dist = camera.position.distanceTo(controls.target);
      camera.position.set(controls.target.x, controls.target.y + dist * 0.7, controls.target.z + dist * 0.7);
      camera.lookAt(controls.target);
    }

    if (recenterUserTrigger !== lastRecenterRef.current && userPosition) {
      lastRecenterRef.current = recenterUserTrigger;
      controls.target.set(userPosition.x, 0, userPosition.z);
      camera.position.set(userPosition.x, 18, userPosition.z + 14);
      controls.update();
    }

    const offset = camera.position.clone().sub(controls.target);
    const angleRad = Math.atan2(offset.x, offset.z);
    setCameraRotationAngle(angleRad * (180 / Math.PI));

    controls.update();
  });

  return null;
}

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

  const floorCenter = useMemo(() => {
    if (!activeFloor) return [22, 0, 12] as [number, number, number];
    return [
      activeFloor.width / 2,
      0,
      activeFloor.depth / 2,
    ] as [number, number, number];
  }, [activeFloor]);

  const setIsFollowingUser = useMapStore((s) => s.setIsFollowingUser);

  return (
    <Canvas
      onPointerDown={() => {
        if (useMapStore.getState().isFollowingUser) {
          setIsFollowingUser(false);
        }
      }}
      shadows
      dpr={[1, 1.25]}
      camera={{
        position: [floorCenter[0] + 24, 30, floorCenter[2] + 26],
        fov: 44,
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
        antialias: false,
        powerPreference: 'high-performance',
        precision: 'mediump',
      }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.85} color="#ffffff" />
        <directionalLight
          position={[35, 50, 30]}
          intensity={1.3}
          color="#ffffff"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={140}
          shadow-camera-left={-45}
          shadow-camera-right={45}
          shadow-camera-top={45}
          shadow-camera-bottom={-45}
        />
        <directionalLight
          position={[-30, 30, -25]}
          intensity={0.5}
          color="#38bdf8"
        />
        <directionalLight
          position={[0, -20, 0]}
          intensity={0.15}
          color="#94a3b8"
        />

        <fog attach="fog" args={['#080d1a', 70, 150]} />

        {building3DMode ? (
          <MultiFloorBuilding
            width={activeFloor?.width ?? 40}
            depth={activeFloor?.depth ?? 48.1}
          />
        ) : (
          <>
            {activeFloor && (
              <FloorPlan
                width={activeFloor.width}
                depth={activeFloor.depth}
                adminMode={adminMode}
                builderMode={builderMode}
                floorId={currentFloor}
              />
            )}
            <RoomManager wallHeight={2.8} />
          </>
        )}

        <RoomBuilderOverlay />

        <NavPath />

        <BeaconLayer />

        <NavigationCameraController
          controlsRef={controlsRef}
          floorCenter={floorCenter}
        />

        <OrbitControls
          ref={controlsRef}
          target={floorCenter}
          enableDamping
          dampingFactor={0.09}
          minDistance={4}
          maxDistance={130}
          maxPolarAngle={Math.PI / 2.05}
          minPolarAngle={0.04}
          enableRotate={true}
          rotateSpeed={1.05}
          enableZoom={true}
          zoomSpeed={1.1}
          enablePan={true}
          panSpeed={1.0}
          touches={{
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN,
          }}
        />
      </Suspense>
    </Canvas>
  );
}
