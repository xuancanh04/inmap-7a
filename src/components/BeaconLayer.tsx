import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '../store/useMapStore';

export function BeaconLayer() {
  const beacons = useMapStore((s) => s.beacons);
  const showBeacons = useMapStore((s) => s.showBeacons);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const activeBeaconMinor = useMapStore((s) => s.activeBeaconMinor);
  const simulateNearestBeacon = useMapStore((s) => s.simulateNearestBeacon);

  const floorBeacons = useMemo(
    () => beacons.filter((b) => b.floor === currentFloor),
    [beacons, currentFloor]
  );

  if (!showBeacons) return null;

  return (
    <group name="beacon-3d-layer">
      {floorBeacons.map((beacon) => {
        const isActive = activeBeaconMinor === beacon.minor;
        const posX = beacon.position.x;
        const posZ = beacon.position.z;

        return (
          <group
            key={beacon.id}
            position={[posX, 3.2, posZ]}
            onClick={(e) => {
              e.stopPropagation();
              simulateNearestBeacon(beacon.minor);
            }}
          >
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.1, 16]} />
              <meshStandardMaterial
                color={isActive ? '#10B981' : '#3B82F6'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>

            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
              <ringGeometry args={[0.3, 0.45, 32]} />
              <meshBasicMaterial
                color={isActive ? '#10B981' : '#38BDF8'}
                transparent
                opacity={isActive ? 0.9 : 0.4}
              />
            </mesh>

            <mesh position={[0, -0.15, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color={isActive ? '#22C55E' : '#38BDF8'} />
            </mesh>

            <Html
              position={[0, 0.4, 0]}
              center
              distanceFactor={22}
              zIndexRange={[1, 50]}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-lg border backdrop-blur-md cursor-pointer transition-all ${
                  isActive
                    ? 'bg-emerald-600/90 text-white border-emerald-300 ring-4 ring-emerald-400/40 scale-110'
                    : 'bg-slate-900/80 text-cyan-300 border-cyan-500/40 hover:scale-105'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>📡 {beacon.name.split('—')[0].trim()}</span>
              </div>
            </Html>
            {isActive && (
              <group position={[0, -3.1, 0]}>
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 0.75, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.6} side={2} />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                  <sphereGeometry args={[0.3, 16, 16]} />
                  <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.5} />
                </mesh>
                <Html
                  position={[0, 0.7, 0]}
                  center
                  zIndexRange={[1, 50]}
                  style={{ pointerEvents: 'none' }}
                >
                  <div className="bg-emerald-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce">
                    📍 Bạn đang ở đây
                  </div>
                </Html>
              </group>
            )}
          </group>
        );
      })}

      <UserGoogleLocationMarker />
    </group>
  );
}

function UserGoogleLocationMarker() {
  const userPosition = useMapStore((s) => s.userPosition);
  const deviceHeading = useMapStore((s) => s.deviceHeading);
  const groupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const headingGroupRef = useRef<THREE.Group>(null);

  const currentPos = useRef(new THREE.Vector3(userPosition?.x ?? 0, 0.22, userPosition?.z ?? 0));
  const currentHeading = useRef(deviceHeading ?? 0);

  useFrame(({ clock }, delta) => {
    if (haloRef.current) {
      const scale = 1 + (Math.sin(clock.getElapsedTime() * 3) + 1) * 0.35;
      haloRef.current.scale.set(scale, scale, 1);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 - (scale - 1) * 0.5;
    }

    if (groupRef.current && userPosition) {
      const targetX = userPosition.x;
      const targetZ = userPosition.z;

      const lerpSpeed = 1.0 - Math.exp(-9.0 * delta);

      currentPos.current.x = THREE.MathUtils.lerp(currentPos.current.x, targetX, lerpSpeed);
      currentPos.current.z = THREE.MathUtils.lerp(currentPos.current.z, targetZ, lerpSpeed);
      groupRef.current.position.set(currentPos.current.x, 0.22, currentPos.current.z);
    }

    if (headingGroupRef.current && deviceHeading !== null) {
      const lerpSpeedHeading = 1.0 - Math.exp(-8.0 * delta);
      let diff = (deviceHeading - currentHeading.current + 180) % 360 - 180;
      if (diff < -180) diff += 360;
      currentHeading.current += diff * lerpSpeedHeading;
      const rad = THREE.MathUtils.degToRad(currentHeading.current);
      headingGroupRef.current.rotation.set(-Math.PI / 2, 0, -rad);
    }
  });

  if (!userPosition) return null;

  return (
    <group ref={groupRef} position={[userPosition.x, 0.22, userPosition.z]}>
      <group ref={headingGroupRef} rotation={[-Math.PI / 2, 0, -THREE.MathUtils.degToRad(deviceHeading ?? 0)]}>
        <mesh position={[0, 1.2, 0]}>
          <ringGeometry args={[0.2, 2.4, 24, 1, Math.PI * 0.3, Math.PI * 0.4]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#1d4ed8" />
      </mesh>

      <Html position={[0, 0.9, 0]} center zIndexRange={[1, 50]} style={{ pointerEvents: 'none' }}>
        <div className="bg-blue-600 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-blue-300/60">
          📍 Vị trí của bạn
        </div>
      </Html>
    </group>
  );
}
