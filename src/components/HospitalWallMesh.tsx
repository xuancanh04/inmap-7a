// ============================================================================
// InMap 7A — HospitalWallMesh.tsx
// Dựng tường rỗng kiến trúc thực tế (Hollow Room Walls) có khe cửa ra vào
// ============================================================================

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
  center?: { x: number; z: number };
}

/**
 * Tạo hệ thống tường kiến trúc 3D thực tế cho phòng:
 * - Hỗ trợ đặt cửa theo tọa độ chính xác từng centimet (doorPositions) khớp 100% bản vẽ 2D
 * - Hoặc tự động tính toán theo doorSide / doorSides / doorCount
 */
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
  center,
}: HospitalWallMeshProps) {
  const wallSegments = useMemo(() => {
    if (!polygon || polygon.length < 3) return [];

    const segments: Array<{
      center: [number, number, number];
      size: [number, number, number];
      rotationY: number;
      isHeader?: boolean;
    }> = [];

    const n = polygon.length;
    const roomCx = center?.x ?? polygon.reduce((acc, p) => acc + p.x, 0) / n;
    const roomCz = center?.z ?? polygon.reduce((acc, p) => acc + p.z, 0) / n;

    // Xác định các cạnh được phép khoét cửa
    const doorEdgeMap = new Map<number, number>(); // edgeIndex -> number of doors

    if (hasDoor) {
      if (doorSides && doorSides.length > 0) {
        // Nhiều cạnh mở cửa
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
        // 1 cạnh mở cửa với số lượng doorCount cửa
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

      // Kiểm tra xem có doorPositions nào nằm trên cạnh này không
      const matchedDoorOffsets: number[] = [];
      if (hasDoor && doorPositions && doorPositions.length > 0) {
        for (const dp of doorPositions) {
          // Tính khoảng cách từ dp đến đoạn thẳng p1-p2
          const segDx = dx / wallLen;
          const segDz = dz / wallLen;
          const proj = (dp.x - p1.x) * segDx + (dp.z - p1.z) * segDz;
          const perpDist = Math.abs((dp.x - p1.x) * -segDz + (dp.z - p1.z) * segDx);

          if (perpDist < 1.0 && proj >= 0 && proj <= wallLen) {
            matchedDoorOffsets.push(proj);
          }
        }
      }

      const numDoors = matchedDoorOffsets.length > 0 ? matchedDoorOffsets.length : (doorEdgeMap.get(i) ?? 0);

      if (numDoors === 0 || wallLen < numDoors * doorWidth + 0.2) {
        // Tường đặc không có cửa
        const midX = (p1.x + p2.x) / 2;
        const midZ = (p1.z + p2.z) / 2;
        segments.push({
          center: [midX, wallHeight / 2, midZ],
          size: [wallLen, wallHeight, wallThickness],
          rotationY: -angle,
          isHeader: false,
        });
      } else if (matchedDoorOffsets.length > 0) {
        // Có tọa độ cửa chính xác: sắp xếp các offset tăng dần
        matchedDoorOffsets.sort((a, b) => a - b);
        const doorHeight = 2.1;
        const headerHeight = wallHeight - doorHeight;

        let curPos = 0;
        for (const dOffset of matchedDoorOffsets) {
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

          // Dầm cửa
          const dMid = doorStart + actualDW / 2;
          const dt = dMid / wallLen;
          segments.push({
            center: [p1.x + dx * dt, doorHeight + headerHeight / 2, p1.z + dz * dt],
            size: [actualDW, headerHeight, wallThickness],
            rotationY: -angle,
            isHeader: true,
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
        // Tường có numDoors cửa phân bố đều
        const doorHeight = 2.1;
        const headerHeight = wallHeight - doorHeight;
        const totalDoorWidth = numDoors * doorWidth;
        const totalWallRemaining = wallLen - totalDoorWidth;
        const pillarWidth = totalWallRemaining / (numDoors + 1);

        let currentDist = 0;

        for (let d = 0; d < numDoors; d++) {
          // Đoạn tường (trụ) trước cửa
          const wallSegCenterDist = currentDist + pillarWidth / 2;
          const tWall = wallSegCenterDist / wallLen;
          segments.push({
            center: [p1.x + dx * tWall, wallHeight / 2, p1.z + dz * tWall],
            size: [pillarWidth, wallHeight, wallThickness],
            rotationY: -angle,
            isHeader: false,
          });
          currentDist += pillarWidth;

          // Ô cửa: dầm ngang trên đỉnh cửa
          const doorCenterDist = currentDist + doorWidth / 2;
          const tDoor = doorCenterDist / wallLen;
          segments.push({
            center: [p1.x + dx * tDoor, doorHeight + headerHeight / 2, p1.z + dz * tDoor],
            size: [doorWidth, headerHeight, wallThickness],
            rotationY: -angle,
            isHeader: true,
          });
          currentDist += doorWidth;
        }

        // Đoạn tường cuối cùng sau cửa cuối
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

  // Load logo bệnh viện để gắn biển hiệu lên tường phòng
  const logoTexture = useLoader(THREE.TextureLoader, '/logo.png');

  // Tìm đoạn tường đặc dài nhất để gắn biển hiệu logo Bệnh Viện Quân Y 7A
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
          {/* Tường thạch cao y tế chuyên dụng: Đồng bộ 1 màu trắng ngọc thanh lịch, tối giản */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={seg.size} />
            <meshStandardMaterial
              color="#f8fafc"
              roughness={0.3}
              metalness={0.04}
            />
          </mesh>

          {/* Viền nẹp chân tường nhôm xước y tế sang trọng (đồng bộ màu xám thanh nhã) */}
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

          {/* Phào chỉ viền đỉnh tường giúp phân tách hình khối kiến trúc */}
          {!seg.isHeader && (
            <mesh position={[0, seg.size[1] / 2 - 0.04, 0]}>
              <boxGeometry args={[seg.size[0] + 0.02, 0.08, seg.size[2] + 0.02]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.1} />
            </mesh>
          )}

          {/* ── CÁNH CỬA & KHUNG CỬA 3D THẬT DƯỚI DẦM CỬA ── */}
          {seg.isHeader && (
            <group position={[0, -seg.size[1] / 2 - 1.05, 0]}>
              {/* Khung bao cửa nhôm xingfa xám cao cấp */}
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

              {/* Cánh cửa phòng bệnh viện gỗ sồi sáng viền kính hé mở nhẹ (30 độ) tạo cảm giác đón tiếp */}
              <group position={[-seg.size[0] / 2 + 0.08, 0, 0]} rotation={[0, 0.45, 0]}>
                {/* Khung cánh cửa */}
                <mesh position={[(seg.size[0] - 0.16) / 2, 0, 0]}>
                  <boxGeometry args={[seg.size[0] - 0.16, 2.02, 0.05]} />
                  <meshStandardMaterial
                    color="#e2e8f0"
                    roughness={0.35}
                    metalness={0.1}
                  />
                </mesh>
                {/* Ô kính quan sát y tế ở giữa cửa */}
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
                {/* Tay nắm cửa gạt Inox 304 sang trọng */}
                <mesh position={[seg.size[0] - 0.3, -0.05, 0.04]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.015, 0.015, 0.14]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
                </mesh>
              </group>
            </group>
          )}
        </group>
      ))}

      {/* ── Biển hiệu Logo Bệnh Viện Quân Y 7A ốp trên mảng tường lớn ── */}
      {longestSolidSeg && (
        <group
          position={[
            longestSolidSeg.center[0],
            wallHeight * 0.65,
            longestSolidSeg.center[2],
          ]}
          rotation={[0, longestSolidSeg.rotationY, 0]}
        >
          {/* Khung biển hiệu màu trắng nổi bật */}
          <mesh position={[0, 0, longestSolidSeg.size[2] / 2 + 0.02]}>
            <boxGeometry args={[1.5, 0.65, 0.03]} />
            <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.1} />
          </mesh>
          {/* Mặt logo in sắc nét có đèn nền hắt */}
          <mesh position={[0, 0, longestSolidSeg.size[2] / 2 + 0.038]}>
            <planeGeometry args={[1.35, 0.52]} />
            <meshBasicMaterial map={logoTexture} transparent side={THREE.DoubleSide} />
          </mesh>
          {/* Viền kim loại mạ crom sáng bóng quanh biển */}
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
