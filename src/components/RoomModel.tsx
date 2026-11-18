import { voiceService } from '../utils/voiceGuidanceService';
import { useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Room } from '../types';
import { useMapStore } from '../store/useMapStore';
import { HospitalWallMesh } from './HospitalWallMesh';
import { HospitalFurniture } from './HospitalFurniture';

interface RoomModelProps {
  room: Room;
  wallHeight?: number;
}

export function RoomModel({ room, wallHeight = 2.8 }: RoomModelProps) {
  const [hovered, setHovered] = useState(false);
  const [isVisibleLabel, setIsVisibleLabel] = useState(true);
  const destinationNodeId = useMapStore((s) => s.navigation.destinationNodeId);
  const selectedRoomId = useMapStore((s) => s.selectedRoomId);
  const navNodes = useMapStore((s) => s.navNodes);

  const isDestination = useMemo(() => {
    if (!destinationNodeId) return false;
    const destNode = navNodes.find((n) => n.id === destinationNodeId);
    return destNode?.roomId === room.id;
  }, [destinationNodeId, navNodes, room.id]);

  const isSelected = selectedRoomId === room.id;

  // Tối ưu hiệu năng: Chỉ render Html DOM nhãn phòng khi ở trong bán kính gần camera
  // Hoặc phòng đó đang được chọn / là đích đến. Giúp giảm 80% tải DOM trên WebView
  useFrame(({ camera }) => {
    if (isDestination || isSelected || hovered) {
      if (!isVisibleLabel) setIsVisibleLabel(true);
      return;
    }
    const cx = room.center?.x ?? 0;
    const cz = room.center?.z ?? 0;
    const distSq = (camera.position.x - cx) ** 2 + (camera.position.z - cz) ** 2;
    // Bán kính hiển thị nhãn ~38m (distSq < 1450)
    const shouldShow = distSq < 1450;
    if (shouldShow !== isVisibleLabel) {
      setIsVisibleLabel(shouldShow);
    }
  });

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

  const floorGeometry = useMemo(
    () => new THREE.ShapeGeometry(floorShape),
    [floorShape]
  );

  const labelPosition: [number, number, number] = useMemo(() => {
    const cx = room.center?.x ?? room.polygon[0]?.x ?? 0;
    const cz = room.center?.z ?? room.polygon[0]?.z ?? 0;
    return [cx, wallHeight + 0.35, cz];
  }, [room.center, room.polygon, wallHeight]);

  const setSelectedRoomId = useMapStore((s) => s.setSelectedRoomId);

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      setSelectedRoomId(room.id);
      voiceService.speak(`Đã chọn ${room.name}`);
    },
    [setSelectedRoomId, room.id, room.name]
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
      <mesh
        geometry={floorGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <meshBasicMaterial
          transparent
          opacity={isDestination ? 0.35 : isSelected ? 0.28 : hovered ? 0.15 : 0}
          color={isDestination ? '#22c55e' : isSelected ? (room.color || '#0284c7') : '#38bdf8'}
          depthWrite={false}
        />
      </mesh>

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
          showDoorFrame={room.showDoorFrame !== false}
          center={room.center}
        />
      )}

      <HospitalFurniture center={room.center} type={room.type || 'medical'} />

      {isVisibleLabel && (
        <Html
          position={labelPosition}
          center
          distanceFactor={44}
          zIndexRange={[1, 50]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: isDestination ? '5px 12px' : isSelected ? '4px 10px' : hovered ? '3px 8px' : '2px 7px',
              borderRadius: 16,
              fontSize: isDestination ? 11.5 : isSelected ? 11 : 10,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              backgroundColor: isDestination
                ? '#16a34a'
                : isSelected
                ? '#0284c7'
                : hovered
                ? '#0f172a'
                : 'rgba(255, 255, 255, 0.94)',
              color: isDestination || isSelected ? '#ffffff' : hovered ? '#38bdf8' : '#0f172a',
              border: isDestination
                ? '1.5px solid #ffffff'
                : isSelected
                ? '1.5px solid #bae6fd'
                : hovered
                ? '1px solid #38bdf8'
                : '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: isDestination
                ? '0 4px 16px rgba(22, 163, 74, 0.45)'
                : isSelected
                ? '0 4px 14px rgba(2, 132, 199, 0.4)'
                : hovered
                ? '0 4px 12px rgba(15, 23, 42, 0.25)'
                : '0 2px 6px rgba(0, 0, 0, 0.08)',
              transform: isDestination ? 'scale(1.08)' : isSelected ? 'scale(1.04)' : 'scale(1)',
              transition: 'all 0.18s ease-out',
            }}
          >
            <span>{room.name}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
export default RoomModel;
