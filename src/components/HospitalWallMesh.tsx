import { useMemo } from 'react';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';
import type { PolygonVertex, Point2D } from '../types';

interface HospitalWallMeshProps {
  polygon: PolygonVertex[];
  wallHeight?: number;
  wallThickness?: number;
  doorWidth?: number;
  color?: string;
  roomName?: string;
  hasDoor?: boolean;
  doorSide?: 'north' | 'south' | 'east' | 'west' | 'none' | 'auto';
  doorSides?: ('north' | 'south' | 'east' | 'west')[];
  doorCount?: number;
  doorPositions?: Point2D[];
  showDoorFrame?: boolean;
  center?: { x: number; z: number };
}

export function HospitalWallMesh({
  polygon,
  wallHeight = 2.8,
  wallThickness = 0.22,
  doorWidth = 1.4,
  hasDoor = true,
  doorSide = 'auto',
  doorSides,
  doorCount = 1,
  doorPositions,
  showDoorFrame = true,
  center,
}: HospitalWallMeshProps) {
  const wallSegments = useMemo(() => {
    if (!polygon || polygon.length < 3) return [];

    const segments: Array<{
      center: [number, number, number];
      size: [number, number, number];
      rotationY: number;
      isHeader?: boolean;
      showFrame?: boolean;
    }> = [];

    const n = polygon.length;
    const roomCx = center?.x ?? polygon.reduce((acc, p) => acc + p.x, 0) / n;
    const roomCz = center?.z ?? polygon.reduce((acc, p) => acc + p.z, 0) / n;

    const doorEdgeMap = new Map<number, number>();

    if (hasDoor) {
      if (doorSides && doorSides.length > 0) {

        for (const side of doorSides) {
          let bestScore = -Infinity;
          let bestIdx = -1;
          for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            const midX = (p1.x + p2.x) / 2;
            const midZ = (p1.z + p2.z) / 2;
            const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
            if (len < doorWidth + 0.4) continue;

            let score = 0;
            if (side === 'south') score = midZ - roomCz;
            else if (side === 'north') score = roomCz - midZ;
            else if (side === 'west') score = roomCx - midX;
            else if (side === 'east') score = midX - roomCx;

            if (score > bestScore) {
              bestScore = score;
              bestIdx = i;
            }
          }
          if (bestIdx !== -1) {
            doorEdgeMap.set(bestIdx, 1);
          }
        }
      } else if (doorSide !== 'none') {

        let targetIdx = -1;
        if (doorSide === 'auto') {
          let maxLen = -1;
          for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
            if (len > maxLen) {
              maxLen = len;
              targetIdx = i;
            }
          }
        } else {
          let bestScore = -Infinity;
          for (let i = 0; i < n; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % n];
            const midX = (p1.x + p2.x) / 2;
            const midZ = (p1.z + p2.z) / 2;
            const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
            if (len < doorWidth + 0.4) continue;

            let score = 0;
            if (doorSide === 'south') score = midZ - roomCz;
            else if (doorSide === 'north') score = roomCz - midZ;
            else if (doorSide === 'west') score = roomCx - midX;
            else if (doorSide === 'east') score = midX - roomCx;

            if (score > bestScore) {
              bestScore = score;
              targetIdx = i;
            }
          }
        }
        if (targetIdx !== -1) {
          doorEdgeMap.set(targetIdx, Math.max(1, doorCount));
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % n];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const wallLen = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);

      const matchedDoors: Array<{ offset: number; hasFrame: boolean }> = [];
      if (hasDoor && doorPositions && doorPositions.length > 0) {
        for (const dp of doorPositions) {

          const segDx = dx / wallLen;
          const segDz = dz / wallLen;
          const proj = (dp.x - p1.x) * segDx + (dp.z - p1.z) * segDz;
          const perpDist = Math.abs((dp.x - p1.x) * -segDz + (dp.z - p1.z) * segDx);

          if (perpDist < 1.0 && proj >= 0 && proj <= wallLen) {
            matchedDoors.push({ offset: proj, hasFrame: dp.hasFrame !== false });
          }
        }
      }

      const numDoors = matchedDoors.length > 0 ? matchedDoors.length : (doorEdgeMap.get(i) ?? 0);

      if (numDoors === 0 || wallLen < numDoors * doorWidth + 0.2) {

        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;
        segments.push({
          center: [midX, wallHeight / 2, midZ],
          size: [wallLen, wallHeight, wallThickness],
          rotationY: -angle,
          isHeader: false,
        });
      } else if (matchedDoors.length > 0) {

        matchedDoors.sort((a, b) => a.offset - b.offset);
        const doorHeight = 2.1;
        const headerHeight = wallHeight - doorHeight;

        let curPos = 0;
        for (const dDoor of matchedDoors) {
          const dOffset = dDoor.offset;
          const doorStart = Math.max(curPos, dOffset - doorWidth / 2);
          const doorEnd = Math.min(wallLen, doorStart + doorWidth);
          const actualDW = doorEnd - doorStart;
          const wallBeforeLen = doorStart - curPos;

          if (wallBeforeLen > 0.05) {
            const wMid = curPos + wallBeforeLen / 2;
            const t = wMid / wallLen;
            segments.push({
              center: [p1.x + dx * t, wallHeight / 2, p1.z + dz * t],
              size: [wallBeforeLen, wallHeight, wallThickness],
              rotationY: -angle,
              isHeader: false,
            });
          }

          const dMid = doorStart + actualDW / 2;
          const dt = dMid / wallLen;
          segments.push({
            center: [p1.x + dx * dt, doorHeight + headerHeight / 2, p1.z + dz * dt],
            size: [actualDW, headerHeight, wallThickness],
            rotationY: -angle,
            isHeader: true,
            showFrame: dDoor.hasFrame,
          });

          curPos = doorEnd;
        }

        if (wallLen - curPos > 0.05) {
          const remainingLen = wallLen - curPos;
          const wMid = curPos + remainingLen / 2;
          const t = wMid / wallLen;
          segments.push({
            center: [p1.x + dx * t, wallHeight / 2, p1.z + dz * t],
            size: [remainingLen, wallHeight, wallThickness],
            rotationY: -angle,
            isHeader: false,
          });
        }
      } else {

        const doorHeight = 2.1;
        const headerHeight = wallHeight - doorHeight;
        const totalDoorWidth = numDoors * doorWidth;
        const totalWallRemaining = wallLen - totalDoorWidth;
        const pillarWidth = totalWallRemaining / (numDoors + 1);

        let currentDist = 0;

        for (let d = 0; d < numDoors; d++) {

          const wallSegCenterDist = currentDist + pillarWidth / 2;
          const tWall = wallSegCenterDist / wallLen;
          segments.push({
            center: [p1.x + dx * tWall, wallHeight / 2, p1.z + dz * tWall],
            size: [pillarWidth, wallHeight, wallThickness],
            rotationY: -angle,
            isHeader: false,
          });
          currentDist += pillarWidth;

          const doorCenterDist = currentDist + doorWidth / 2;
          const tDoor = doorCenterDist / wallLen;
          segments.push({
            center: [p1.x + dx * tDoor, doorHeight + headerHeight / 2, p1.z + dz * tDoor],
            size: [doorWidth, headerHeight, wallThickness],
            rotationY: -angle,
            isHeader: true,
            showFrame: true,
          });
          currentDist += doorWidth;
        }

        const lastWallSegCenterDist = currentDist + pillarWidth / 2;
        const tLast = lastWallSegCenterDist / wallLen;
        segments.push({
          center: [p1.x + dx * tLast, wallHeight / 2, p1.z + dz * tLast],
          size: [pillarWidth, wallHeight, wallThickness],
          rotationY: -angle,
          isHeader: false,
        });
      }
    }

    return segments;
  }, [polygon, wallHeight, wallThickness, doorWidth, hasDoor, doorSide, doorSides, doorCount, doorPositions, center]);

  const logoTexture = useLoader(THREE.TextureLoader, '/logo.png');

  const longestSolidSeg = useMemo(() => {
    let maxLen = 0;
    let bestSeg: typeof wallSegments[0] | null = null;
    for (const seg of wallSegments) {
      if (!seg.isHeader && seg.size[0] > maxLen) {
        maxLen = seg.size[0];
        bestSeg = seg;
      }
    }
    return maxLen >= 3.5 ? bestSeg : null;
  }, [wallSegments]);

  return (
    <group name="hospital-walls">
      {wallSegments.map((seg, idx) => (
        <group
          key={idx}
          position={seg.center}
          rotation={[0, seg.rotationY, 0]}
        >
          <mesh castShadow receiveShadow>
            <boxGeometry args={seg.size} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.3}
              metalness={0.04}
            />
          </mesh>

          {!seg.isHeader && (
            <mesh position={[0, -seg.size[1] / 2 + 0.08, 0]}>
              <boxGeometry args={[seg.size[0], 0.16, seg.size[2] + 0.02]} />
              <meshStandardMaterial
                color="#64748b"
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>
          )}

          {!seg.isHeader && (
            <mesh position={[0, seg.size[1] / 2 - 0.04, 0]}>
              <boxGeometry args={[seg.size[0] + 0.02, 0.08, seg.size[2] + 0.02]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.1} />
            </mesh>
          )}

          {seg.isHeader && showDoorFrame && seg.showFrame !== false && (
            <group position={[0, -seg.size[1] / 2 - 1.05, 0]}>
              <mesh position={[-seg.size[0] / 2 + 0.04, 0, 0]}>
                <boxGeometry args={[0.08, 2.1, seg.size[2] + 0.02]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
              </mesh>
              <mesh position={[seg.size[0] / 2 - 0.04, 0, 0]}>
                <boxGeometry args={[0.08, 2.1, seg.size[2] + 0.02]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
              </mesh>
              <mesh position={[0, 1.01, 0]}>
                <boxGeometry args={[seg.size[0], 0.08, seg.size[2] + 0.02]} />
                <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.6} />
              </mesh>

              <group position={[-seg.size[0] / 2 + 0.08, 0, 0]} rotation={[0, 0.45, 0]}>
                <mesh position={[(seg.size[0] - 0.16) / 2, 0, 0]}>
                  <boxGeometry args={[seg.size[0] - 0.16, 2.02, 0.05]} />
                  <meshStandardMaterial
                    color="#e2e8f0"
                    roughness={0.35}
                    metalness={0.1}
                  />
                </mesh>
                <mesh position={[(seg.size[0] - 0.16) / 2, 0.35, 0]}>
                  <boxGeometry args={[seg.size[0] * 0.45, 0.7, 0.06]} />
                  <meshStandardMaterial
                    color="#bae6fd"
                    transparent
                    opacity={0.6}
                    roughness={0.1}
                    metalness={0.9}
                  />
                </mesh>
                <mesh position={[seg.size[0] - 0.3, -0.05, 0.04]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.14]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
                </mesh>
              </group>
            </group>
          )}
        </group>
      ))}

      {longestSolidSeg && (
        <group
          position={[
            longestSolidSeg.center[0],
            wallHeight * 0.65,
            longestSolidSeg.center[2],
          ]}
          rotation={[0, longestSolidSeg.rotationY, 0]}
        >
          <mesh position={[0, 0, longestSolidSeg.size[2] / 2 + 0.02]}>
            <boxGeometry args={[1.5, 0.65, 0.03]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0, longestSolidSeg.size[2] / 2 + 0.038]}>
            <planeGeometry args={[1.35, 0.52]} />
            <meshBasicMaterial map={logoTexture} transparent side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0, longestSolidSeg.size[2] / 2 + 0.015]}>
            <boxGeometry args={[1.56, 0.71, 0.02]} />
            <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default HospitalWallMesh;
