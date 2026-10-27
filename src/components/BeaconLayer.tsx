// ============================================================================
// InMap 7A — BeaconLayer.tsx
// Hiển thị trực quan 3D các mốc phát sóng BLE Beacon (DFRobot Gravity) trên trần nhà
// ============================================================================

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
            {/* Cột sóng tròn nhấp nháy phát tín hiệu */}
            <mesh position={[0, -0.05, 0]}>
              <cylinderGeometry args={[0.25, 0.25, 0.1, 16]} />
              <meshStandardMaterial
                color={isActive ? '#10B981' : '#3B82F6'}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>

            {/* Vòng tròn sóng lan tỏa (Radio wave ring) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
              <ringGeometry args={[0.3, 0.45, 32]} />
              <meshBasicMaterial
                color={isActive ? '#10B981' : '#38BDF8'}
                transparent
                opacity={isActive ? 0.9 : 0.4}
              />
            </mesh>

            {/* Đèn LED trung tâm chớp nháy */}
            <mesh position={[0, -0.15, 0]}>
              <sphereGeometry args={[0.08, 16, 16]} />
              <meshBasicMaterial color={isActive ? '#22C55E' : '#38BDF8'} />
            </mesh>

            {/* Nhãn 3D hiển thị thông tin Beacon */}
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
            {/* Chấm vị trí người dùng (Blue Dot) trên sàn nhà khi đang ở trạm Beacon này */}
            {isActive && (
              <group position={[0, -3.1, 0]}>
                {/* Vòng xung kích nhấp nháy trên mặt sàn */}
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 0.75, 32]} />
                  <meshBasicMaterial color="#10b981" transparent opacity={0.6} side={2} />
                </mesh>
                {/* Chấm tròn định vị avatar */}
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


      {/* ── Chấm định vị Google Maps Blue Dot di chuyển tự do theo userPosition ── */}
      <UserGoogleLocationMarker />
    </group>
  );
}

/**
 * Marker vị trí người dùng kiểu Google Maps:
 * - Chấm xanh viền trắng phát sáng
 * - Vòng xung nhịp radar (Pulsing halo)
 * - Nón ánh sáng la bàn (Compass field-of-view beam) chỉ về hướng nhìn ngoài đời
 */
function UserGoogleLocationMarker() {
  const userPosition = useMapStore((s) => s.userPosition);
  const deviceHeading = useMapStore((s) => s.deviceHeading);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (haloRef.current) {
      const scale = 1 + (Math.sin(clock.getElapsedTime() * 3) + 1) * 0.35;
      haloRef.current.scale.set(scale, scale, 1);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = 0.5 - (scale - 1) * 0.5;
    }
  });

  if (!userPosition) return null;

  // Góc xoay la bàn tính theo radian
  const headingRad = THREE.MathUtils.degToRad(deviceHeading ?? 0);

  return (
    <group position={[userPosition.x, 0.22, userPosition.z]}>
      {/* 1. Nón ánh sáng La bàn chỉ hướng mặt (Compass Beam) */}
      <group rotation={[-Math.PI / 2, 0, -headingRad]}>
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

      {/* 2. Vòng radar phát sóng nhịp đập */}
      <mesh ref={haloRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>

      {/* 3. Vòng viền trắng mạ kim loại */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.55, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 4. Chấm xanh Google Blue Dot cốt lõi */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial color="#1d4ed8" />
      </mesh>

      {/* 5. Nhãn "Vị trí của bạn" */}
      <Html position={[0, 0.9, 0]} center zIndexRange={[1, 50]} style={{ pointerEvents: 'none' }}>
        <div className="bg-blue-600 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-blue-300/60">
          📍 Vị trí của bạn
        </div>
      </Html>
    </group>
  );
}

