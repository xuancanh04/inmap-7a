// ============================================================================
// InMap 7A — RoomModel.tsx
// Mô hình Kiến trúc Bệnh viện 3D Thực tế: Tường kiến trúc, Cửa, Gạch sàn y tế, Đồ nội thất & Nhãn HTML
// ============================================================================

import { useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { Room } from '../types';
import { useMapStore } from '../store/useMapStore';
import { HospitalWallMesh } from './HospitalWallMesh';
import { HospitalFurniture } from './HospitalFurniture';

interface RoomModelProps {
  room: Room;
  /** Chiều cao tường (mặc định: 2.8m thực tế) */
  wallHeight?: number;
}

export function RoomModel({ room, wallHeight = 2.8 }: RoomModelProps) {
  const [hovered, setHovered] = useState(false);
  const navigateToRoom = useMapStore((s) => s.navigateToRoom);
  const destinationNodeId = useMapStore((s) => s.navigation.destinationNodeId);
  const navNodes = useMapStore((s) => s.navNodes);

  // Kiểm tra phòng có đang được chọn làm đích đến không
  const isDestination = useMemo(() => {
    if (!destinationNodeId) return false;
    const destNode = navNodes.find((n) => n.id === destinationNodeId);
    return destNode?.roomId === room.id;
  }, [destinationNodeId, navNodes, room.id]);

  // Tạo Shape 2D mặt sàn của phòng
  const floorShape = useMemo(() => {
    const s = new THREE.Shape();
    if (!room.polygon || room.polygon.length === 0) return s;

    const [first, ...rest] = room.polygon;
    s.moveTo(first.x, first.z);
    for (const v of rest) {
      s.lineTo(v.x, v.z);
    }
    s.closePath();
    return s;
  }, [room.polygon]);

  // Mặt sàn phòng ốp gạch y tế
  const floorGeometry = useMemo(
    () => new THREE.ShapeGeometry(floorShape),
    [floorShape]
  );

  // Vị trí đặt nhãn tên phòng
  const labelPosition: [number, number, number] = useMemo(() => {
    const cx = room.center?.x ?? room.polygon[0]?.x ?? 0;
    const cz = room.center?.z ?? room.polygon[0]?.z ?? 0;
    return [cx, wallHeight + 0.6, cz];
  }, [room.center, room.polygon, wallHeight]);

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      navigateToRoom(room.id);
    },
    [navigateToRoom, room.id]
  );

  const handlePointerOver = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setHovered(true);
      document.body.style.cursor = 'pointer';
    },
    []
  );

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  return (
    <group
      name={`room-${room.id}`}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* ── 1. Mặt sàn gạch men y tế chuyên dụng (Medical Floor Tiles) ── */}
      <mesh
        geometry={floorGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color={isDestination ? '#10b981' : hovered ? '#e0f2fe' : '#f1f5f9'}
          roughness={0.15}
          metalness={0.1}
          emissive={isDestination ? '#10b981' : hovered ? '#38bdf8' : '#000000'}
          emissiveIntensity={isDestination ? 0.3 : hovered ? 0.15 : 0}
        />
      </mesh>

      {/* ── 2. Hệ tường kiến trúc rỗng có ô cửa mở vào phòng (Hospital Wall System) ── */}
      {!room.noWall && (
        <HospitalWallMesh
          polygon={room.polygon}
          wallHeight={wallHeight}
          wallThickness={0.25}
          doorWidth={1.4}
          color={room.color || '#38bdf8'}
          roomName={room.name}
          hasDoor={room.doorSide !== 'none'}
          doorSide={room.doorSide ?? 'auto'}
          doorSides={room.doorSides}
          doorCount={room.doorCount}
          doorPositions={room.doorPositions}
          center={room.center}
        />
      )}

      {/* ── 3. Nội thất 3D chi tiết (Giường bệnh, bàn khám, máy tính, đèn LED trần) ── */}
      <HospitalFurniture center={room.center} type={room.type || 'medical'} />

      {/* ── 4. Nhãn tên khoa phòng công nghệ cao ── */}
      <Html
        position={labelPosition}
        center
        distanceFactor={28}
        zIndexRange={[1, 50]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold select-none whitespace-nowrap shadow-2xl transition-all duration-200 border backdrop-blur-md ${
            isDestination
              ? 'bg-emerald-600 text-white border-emerald-300 ring-4 ring-emerald-400/40 shadow-emerald-500/40 scale-110'
              : hovered
              ? 'bg-slate-900/95 text-white border-cyan-400 ring-2 ring-cyan-400/30 scale-105'
              : 'bg-slate-900/85 text-slate-100 border-white/20'
          }`}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: room.color || '#38bdf8' }}
          />
          <span>{room.name}</span>
        </div>
      </Html>
    </group>
  );
}
export default RoomModel;
