import type { Point2D } from '../types';

interface HospitalFurnitureProps {
  center: Point2D;
  type?: 'medical' | 'office' | 'utility' | 'public' | 'pharmacy' | string;
}

export function HospitalFurniture({ center, type = 'medical' }: HospitalFurnitureProps) {
  const { x, z } = center;

  return (
    <group position={[x, 0, z]}>
      {type === 'medical' && (

        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.25, 0]} castShadow>
            <boxGeometry args={[1.2, 0.1, 2.1]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.7} roughness={0.3} />
          </mesh>
          {[
            [-0.5, -0.9],
            [0.5, -0.9],
            [-0.5, 0.9],
            [0.5, 0.9],
          ].map(([legX, legZ], idx) => (
            <mesh key={idx} position={[legX, 0.12, legZ]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.24]} />
              <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
            </mesh>
          ))}
          <mesh position={[0, 0.38, 0]} castShadow>
            <boxGeometry args={[1.1, 0.15, 2.0]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.48, -0.75]} castShadow>
            <boxGeometry args={[0.7, 0.08, 0.35]} />
            <meshStandardMaterial color="#ffffff" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.48, -1.02]}>
            <boxGeometry args={[1.2, 0.45, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.4, 1.02]}>
            <boxGeometry args={[1.2, 0.3, 0.05]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.6} />
          </mesh>
          <group position={[0.75, 0, -0.8]}>
            <mesh position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 1.7]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0, 1.65, 0]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.7} />
            </mesh>
          </group>
        </group>
      )}

      {type === 'office' && (

        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.72, 0]} castShadow>
            <boxGeometry args={[1.8, 0.06, 0.9]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
          </mesh>
          <mesh position={[-0.8, 0.36, 0]} castShadow>
            <boxGeometry args={[0.06, 0.72, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.6} />
          </mesh>
          <mesh position={[0.8, 0.36, 0]} castShadow>
            <boxGeometry args={[0.06, 0.72, 0.8]} />
            <meshStandardMaterial color="#475569" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0.95, -0.15]}>
            <boxGeometry args={[0.6, 0.35, 0.03]} />
            <meshStandardMaterial color="#334155" roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.77, -0.15]}>
            <cylinderGeometry args={[0.03, 0.08, 0.08]} />
            <meshStandardMaterial color="#94a3b8" />
          </mesh>
          <mesh position={[0, 0.45, 0.6]} castShadow>
            <boxGeometry args={[0.5, 0.08, 0.5]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.75, 0.8]}>
            <boxGeometry args={[0.48, 0.5, 0.06]} />
            <meshStandardMaterial color="#3b82f6" roughness={0.4} />
          </mesh>
        </group>
      )}

      {type === 'utility' && (

        <group position={[0, 0, 0]}>
          <mesh position={[0, 1.0, 0]} castShadow>
            <boxGeometry args={[1.2, 2.0, 0.8]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.4} roughness={0.3} />
          </mesh>
          <mesh position={[0, 1.6, 0.41]}>
            <boxGeometry args={[0.9, 0.05, 0.01]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
          <mesh position={[0, 1.4, 0.41]}>
            <boxGeometry args={[0.9, 0.05, 0.01]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        </group>
      )}

      {type === 'public' && (

        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[2.2, 0.06, 0.5]} />
            <meshStandardMaterial color="#0284c7" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.68, -0.22]} castShadow>
            <boxGeometry args={[2.2, 0.45, 0.05]} />
            <meshStandardMaterial color="#0284c7" roughness={0.4} />
          </mesh>
          <mesh position={[-0.9, 0.21, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.42]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
          <mesh position={[0.9, 0.21, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.42]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.8} />
          </mesh>
        </group>
      )}

      {type === 'elevator' && (
        <group position={[0, 0, 0]}>
          {[-4.2, 0, 4.2].map((offX, idx) => (
            <group key={idx} position={[offX, 0, 0]}>
              <mesh position={[0, 1.3, 0]} castShadow>
                <boxGeometry args={[2.4, 2.6, 2.2]} />
                <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.25} />
              </mesh>
              {/* Cửa thang mặt Bắc (hướng về hành lang trên z=19.26) */}
              <group position={[0, 0, -1.11]} rotation={[0, Math.PI, 0]}>
                <mesh position={[0, 1.15, 0]}>
                  <boxGeometry args={[1.7, 2.3, 0.06]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
                </mesh>
                <mesh position={[-0.41, 1.1, 0.02]}>
                  <boxGeometry args={[0.78, 2.15, 0.03]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
                </mesh>
                <mesh position={[0.41, 1.1, 0.02]}>
                  <boxGeometry args={[0.78, 2.15, 0.03]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
                </mesh>
                <mesh position={[0, 2.15, 0.04]}>
                  <boxGeometry args={[0.5, 0.16, 0.03]} />
                  <meshStandardMaterial color="#020617" />
                </mesh>
                <mesh position={[0, 2.15, 0.06]}>
                  <boxGeometry args={[0.3, 0.08, 0.01]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </group>
              {/* Cửa thang mặt Nam (hướng về hành lang dưới z=27.71) */}
              <group position={[0, 0, 1.11]}>
                <mesh position={[0, 1.15, 0]}>
                  <boxGeometry args={[1.7, 2.3, 0.06]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
                </mesh>
                <mesh position={[-0.41, 1.1, 0.02]}>
                  <boxGeometry args={[0.78, 2.15, 0.03]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
                </mesh>
                <mesh position={[0.41, 1.1, 0.02]}>
                  <boxGeometry args={[0.78, 2.15, 0.03]} />
                  <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.2} />
                </mesh>
                <mesh position={[0, 2.15, 0.04]}>
                  <boxGeometry args={[0.5, 0.16, 0.03]} />
                  <meshStandardMaterial color="#020617" />
                </mesh>
                <mesh position={[0, 2.15, 0.06]}>
                  <boxGeometry args={[0.3, 0.08, 0.01]} />
                  <meshBasicMaterial color="#22c55e" />
                </mesh>
              </group>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

export default HospitalFurniture;
