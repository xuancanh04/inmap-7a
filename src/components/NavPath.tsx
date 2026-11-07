import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMapStore } from '../store/useMapStore';

const PATH_Y = 0.18;

export function NavPath() {
  const path = useMapStore((s) => s.navigation.path);
  const navNodes = useMapStore((s) => s.navNodes);
  const rooms = useMapStore((s) => s.rooms);
  const destinationNodeId = useMapStore((s) => s.navigation.destinationNodeId);
  const destMarkerRef = useRef<THREE.Mesh>(null);
  const arrowsGroupRef = useRef<THREE.Group>(null);
  const pulseRingsRef = useRef<THREE.Group>(null);

  const originNodeId = useMapStore((s) => s.navigation.originNodeId);

  const userPosition = useMapStore((s) => s.userPosition);

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

  const points = useMemo(() => {
    if (rawPoints.length < 2) return [];
    if (!userPosition) return rawPoints;

    const uX = userPosition.x;
    const uZ = userPosition.z;

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

    if (bestDist < 4.0) {
      const remaining: THREE.Vector3[] = [projPoint];
      for (let i = bestSegIdx + 1; i < rawPoints.length; i++) {
        remaining.push(rawPoints[i]);
      }
      return remaining;
    }

    return rawPoints;
  }, [rawPoints, userPosition]);

  const linePoints = useMemo(() => {
    return points.map((p) => [p.x, p.y, p.z] as [number, number, number]);
  }, [points]);

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
      const step = 2.5;
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

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Hiệu ứng floating & pulse cho điểm đích
    if (destMarkerRef.current) {
      const scale = 1 + 0.12 * Math.sin(t * 3.5);
      destMarkerRef.current.scale.set(scale, scale, scale);
      destMarkerRef.current.position.y = 0.8 + 0.1 * Math.sin(t * 3);
    }

    // Hiệu ứng sóng radar phát ra liên tục tại điểm xuất phát
    if (pulseRingsRef.current) {
      const wave = (t * 1.5) % 1;
      pulseRingsRef.current.scale.set(1 + wave * 1.8, 1 + wave * 1.8, 1);
      const ringMat = (pulseRingsRef.current.children[0] as THREE.Mesh)?.material as THREE.MeshBasicMaterial;
      if (ringMat) {
        ringMat.opacity = Math.max(0, 0.7 * (1 - wave));
      }
    }

    // Hiệu ứng các mũi tên di chuyển dạng dòng chảy (flowing pulse)
    if (arrowsGroupRef.current) {
      const children = arrowsGroupRef.current.children;
      const count = children.length;
      for (let i = 0; i < count; i++) {
        const arrow = children[i] as THREE.Group;
        // Tạo chuỗi sáng dịch chuyển tuần hoàn
        const phase = (i * 0.25 - t * 2.8) % (Math.PI * 2);
        const glow = Math.max(0.2, (Math.sin(phase) + 1) / 2);
        arrow.scale.set(0.9 + glow * 0.45, 0.9 + glow * 0.45, 0.9 + glow * 0.45);
        
        arrow.children.forEach((mesh) => {
          const mat = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
          if (mat) {
            mat.opacity = 0.35 + glow * 0.65;
            mat.color.set(glow > 0.6 ? '#60a5fa' : '#ffffff');
          }
        });
      }
    }
  });

  if (points.length < 2) return null;

  const startPt = points[0];
  const endPt = points[points.length - 1];

  return (
    <group name="navigation-path-layer">
      <Line
        points={linePoints}
        color="#0ea5e9"
        lineWidth={12}
        transparent
        opacity={0.35}
      />

      <Line
        points={linePoints}
        color="#2563eb"
        lineWidth={7}
        transparent
        opacity={0.9}
      />

      <Line
        points={linePoints}
        color="#60a5fa"
        lineWidth={3}
      />

      <group ref={arrowsGroupRef}>
        {directionalArrows.map((arrow, idx) => (
          <group
            key={idx}
            position={arrow.pos}
            rotation={[0, arrow.rotY, 0]}
          >
            <mesh
              rotation={[-Math.PI / 2, 0, Math.PI / 4]}
              position={[-0.08, 0, 0]}
            >
              <planeGeometry args={[0.08, 0.32]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
            <mesh
              rotation={[-Math.PI / 2, 0, -Math.PI / 4]}
              position={[0.08, 0, 0]}
            >
              <planeGeometry args={[0.08, 0.32]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
      </group>

      <group position={[startPt.x, PATH_Y, startPt.z]}>
        <group ref={pulseRingsRef}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
            <ringGeometry args={[0.25, 0.65, 32]} />
            <meshBasicMaterial
              color="#38bdf8"
              transparent
              opacity={0.6}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[0.3, 0.8, 32]} />
          <meshBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.22, 0.38, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <circleGeometry args={[0.22, 32]} />
          <meshBasicMaterial color="#2563eb" side={THREE.DoubleSide} />
        </mesh>

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

      <group position={[endPt.x, PATH_Y, endPt.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <circleGeometry args={[0.35, 32]} />
          <meshBasicMaterial color="#0f172a" transparent opacity={0.4} side={THREE.DoubleSide} />
        </mesh>

        <group ref={destMarkerRef} position={[0, 0.8, 0]}>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[0.42, 24, 24]} />
            <meshStandardMaterial color="#ea4335" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.38, 0.6, 24]} />
            <meshStandardMaterial color="#ea4335" roughness={0.2} metalness={0.1} />
          </mesh>
          <mesh position={[0, 0.3, 0.35]}>
            <circleGeometry args={[0.16, 24]} />
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} />
          </mesh>
        </group>

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
