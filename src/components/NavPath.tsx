// ============================================================================
// InMap 7A — NavPath.tsx
// Vẽ đường dẫn đường thông minh có mũi tên neon lướt chạy theo chiều đi
// ============================================================================

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '../store/useMapStore';

const PATH_Y = 0.18; // Nâng đường lên khỏi mặt sàn tránh z-fighting

/**
 * Component vẽ đường dẫn đường thông minh:
 * - Dải sáng neon màu xanh ngọc phát sáng dẫn lối.
 * - Các mũi tên chỉ hướng đi cố định in trên mặt sàn chỉ rõ chiều đi.
 * - Marker cờ đích & vòng sóng tỏa nổi bật tại điểm đến.
 */
export function NavPath() {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);
  const rooms = useMapStore((s) => s.rooms);
  const destinationNodeId = useMapStore((s) => s.navigation.destinationNodeId);
  const destMarkerRef = useRef<THREE.Mesh>(null);

  const originNodeId = useMapStore((s) => s.navigation.originNodeId);

  const userPosition = useMapStore((s) => s.userPosition);

  // Chuyển đổi mảng node IDs → mảng Vector3 3D đầy đủ
  const rawPoints = useMemo(() => {
    if (path.length < 2) return [];
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const pts: THREE.Vector3[] = [];

    for (const nodeId of path) {
      const node = nodeMap.get(nodeId);
      if (node) {
        pts.push(new THREE.Vector3(node.position.x, PATH_Y, node.position.z));
      }
    }
    return pts;
  }, [path, navNodes]);

  // Thu ngắn đường dẫn theo bước chân người đi (Chuẩn Google Maps: đi tới đâu xóa đường tới đó)
  const points = useMemo(() => {
    if (rawPoints.length < 2) return [];
    if (!userPosition) return rawPoints;

    const uX = userPosition.x;
    const uZ = userPosition.z;

    // Tìm đoạn thẳng trên lộ trình mà người dùng đang đứng gần nhất
    let bestDist = Infinity;
    let bestSegIdx = 0;
    let projPoint = new THREE.Vector3(uX, PATH_Y, uZ);

    for (let i = 0; i < rawPoints.length - 1; i++) {
      const p1 = rawPoints[i];
      const p2 = rawPoints[i + 1];

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segLenSq = dx * dx + dz * dz;

      let t = 0;
      if (segLenSq > 0.0001) {
        t = ((uX - p1.x) * dx + (uZ - p1.z) * dz) / segLenSq;
        t = Math.max(0, Math.min(1, t));
      }

      const nearX = p1.x + t * dx;
      const nearZ = p1.z + t * dz;
      const dist = Math.hypot(uX - nearX, uZ - nearZ);

      if (dist < bestDist) {
        bestDist = dist;
        bestSegIdx = i;
        projPoint = new THREE.Vector3(nearX, PATH_Y, nearZ);
      }
    }

    // Nếu người dùng ở trong phạm vi hành lang dẫn đường (< 4 mét), cắt bỏ đoạn đã đi qua
    if (bestDist < 4.0) {
      const remaining: THREE.Vector3[] = [projPoint];
      for (let i = bestSegIdx + 1; i < rawPoints.length; i++) {
        remaining.push(rawPoints[i]);
      }
      return remaining;
    }

    return rawPoints;
  }, [rawPoints, userPosition]);

  // Mảng điểm cho Line rendering
  const linePoints = useMemo(() => {
    return points.map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [points]);

  // Tìm tên điểm xuất phát và điểm đích
  const originName = useMemo(() => {
    if (!originNodeId) return 'Vị trí của bạn';
    const node = navNodes.find((n) => n.id === originNodeId);
    if (!node?.roomId) return node?.label ?? 'Vị trí của bạn';
    const room = rooms.find((r) => r.id === node.roomId);
    return room?.name ?? node.label ?? 'Vị trí của bạn';
  }, [originNodeId, navNodes, rooms]);

  const destRoomName = useMemo(() => {
    if (!destinationNodeId) return 'Điểm đến';
    const node = navNodes.find((n) => n.id === destinationNodeId);
    if (!node?.roomId) return node?.label ?? 'Điểm đến';
    const room = rooms.find((r) => r.id === node.roomId);
    return room?.name ?? node.label ?? 'Điểm đến';
  }, [destinationNodeId, navNodes, rooms]);

  // Tạo các mũi tên V-shape chevron tinh tế (kiểu Google Maps) nằm phẳng chìm trên dải đường xanh còn lại
  const directionalArrows = useMemo(() => {
    if (points.length < 2) return [];
    const arrows: Array<{
      pos: [number, number, number];
      rotY: number;
    }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1.0) continue;

      const angle = Math.atan2(dx, dz);
      const step = 2.5; // Đặt cách nhau 2.5m thoáng đãng
      const numArrows = Math.max(1, Math.floor(segLen / step));

      for (let j = 1; j <= numArrows; j++) {
        const t = j / (numArrows + 1);
        arrows.push({
          pos: [p1.x + dx * t, PATH_Y + 0.03, p1.z + dz * t],
          rotY: angle,
        });
      }
    }
    return arrows;
  }, [points]);

  // Animation cho vòng sóng xung kích của Blue Dot Google Maps
  useFrame(({ clock }) => {
    if (destMarkerRef.current) {
      const t = clock.getElapsedTime();
      const scale = 1 + 0.12 * Math.sin(t * 3);
      destMarkerRef.current.scale.set(scale, scale, scale);
    }
  });

  if (points.length < 2) return null;

  const startPt = points[0];
  const endPt = points[points.length - 1];

  return (
    <group name="navigation-path-layer">
      {/* ── 1. Viền ngoài bóng mờ của đường dẫn (Google Maps road casing) ── */}
      <Line
        points={linePoints}
        color="#1d4ed8"
        lineWidth={8}
        dashed={false}
      />

      {/* ── 2. Dải đường màu xanh Google Maps đặc trưng (#3b82f6 / #4285F4) ── */}
      <Line
        points={linePoints}
        color="#3b82f6"
        lineWidth={6}
        dashed={false}
      />

      {/* ── 3. Các mũi tên Chevron chỉ hướng kiểu Google Maps thanh mảnh, tinh tế ── */}
      <group>
        {directionalArrows.map((arrow, idx) => (
          <group
            key={idx}
            position={arrow.pos}
            rotation={[0, arrow.rotY, 0]}
          >
            {/* Cánh trái chevron */}
            <mesh
              rotation={[-Math.PI / 2, 0, Math.PI / 4]}
              position={[-0.08, 0, 0]}
            >
              <planeGeometry args={[0.07, 0.28]} />
              <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
            </mesh>
            {/* Cánh phải chevron */}
            <mesh
              rotation={[-Math.PI / 2, 0, -Math.PI / 4]}
              position={[0.08, 0, 0]}
            >
              <planeGeometry args={[0.07, 0.28]} />
              <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 4. ĐIỂM XUẤT PHÁT: Google Maps Blue Dot (Chấm xanh viền trắng có hào quang) ── */}
      <group position={[startPt.x, PATH_Y, startPt.z]}>
        {/* Hào quang xanh tỏa rộng dưới sàn */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.3, 0.9, 32]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Vành tròn trắng ngoài */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.22, 0.38, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
        {/* Chấm tròn xanh Google Maps ở giữa */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial color="#2563eb" side={THREE.DoubleSide} />
        </mesh>

        {/* Nhãn Google Maps: Điểm đi */}
        <Html
          position={[0, 0.9, 0]}
          center
          zIndexRange={[1, 50]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center select-none">
            <div className="bg-blue-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-lg border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>{originName}</span>
            </div>
            <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-blue-600" />
          </div>
        </Html>
      </group>

      {/* ── 5. ĐIỂM ĐẾN: Google Maps Red Pin (Ghim đỏ giọt nước chuẩn Google Maps) ── */}
      <group position={[endPt.x, PATH_Y, endPt.z]}>
        {/* Bóng đen đổ tròn dưới chân ghim */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.35, 32]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>

        {/* Cụm ghim 3D chuẩn Google Maps hình giọt nước có chấm trắng ở giữa */}
        <group ref={destMarkerRef} position={[0, 0.8, 0]}>
          {/* Khối đầu ghim tròn màu đỏ */}
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.42, 24, 24]} />
            <meshStandardMaterial color="#ea4335" roughness={0.2} metalness={0.1} />
          </mesh>
          {/* Mũi nhọn ghim chĩa xuống đất */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.38, 0.6, 24]} />
            <meshStandardMaterial color="#ea4335" roughness={0.2} metalness={0.1} />
          </mesh>
          {/* Chấm tròn trắng đặc trưng bên trong ghim Google Maps */}
          <mesh position={[0, 0.3, 0.35]}>
            <circleGeometry args={[0.16, 24]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Huy hiệu Google Maps điểm đến */}
        <Html
          position={[0, 1.85, 0]}
          center
          zIndexRange={[1, 50]}
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex flex-col items-center select-none animate-bounce">
            <div className="bg-red-600 text-white font-extrabold text-xs px-3 py-1 rounded-full shadow-2xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap">
              <span>📍</span>
              <span>{destRoomName}</span>
            </div>
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-600" />
          </div>
        </Html>
      </group>
    </group>
  );
}
export default NavPath;
