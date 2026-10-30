import { useMemo, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
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
  const navigateToRoom = useMapStore((s) => s.navigateToRoom);
  const destinationNodeId = useMapStore((s) => s.navigation.destinationNodeId);
  const navNodes = useMapStore((s) => s.navNodes);

  const isDestination = useMemo(() => {
    if (!destinationNodeId) return false;
    const destNode = navNodes.find((n) => n.id === destinationNodeId);
    return destNode?.roomId === room.id;
  }, [destinationNodeId, navNodes, room.id]);

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
      <mesh
        geometry={floorGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 0]}
      >
        <meshBasicMaterial
          transparent
          opacity={0}
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

      <Html
        position={labelPosition}
        center
        distanceFactor={38}
        zIndexRange={[1, 50]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isDestination ? '5px 12px' : hovered ? '4px 10px' : '3px 8px',
            borderRadius: 20,
            fontSize: isDestination ? 12 : 11,
            fontWeight: 700,
            letterSpacing: '-0.2px',
            userSelect: 'none',
            whiteSpace: 'nowrap',
            backgroundColor: isDestination
              ? '#16a34a'
              : hovered
              ? '#0f172a'
              : 'rgba(255, 255, 255, 0.94)',
            color: isDestination ? '#ffffff' : hovered ? '#38bdf8' : '#1e293b',
            border: isDestination
              ? '2px solid #ffffff'
              : hovered
              ? '1.5px solid #38bdf8'
              : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: isDestination
              ? '0 6px 20px rgba(22, 163, 74, 0.55)'
              : hovered
              ? '0 6px 18px rgba(15, 23, 42, 0.35)'
              : '0 2px 8px rgba(0, 0, 0, 0.1)',
            transform: isDestination ? 'scale(1.15)' : hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'all 0.18s ease-out',
          }}
        >
          <span>{room.name}</span>
        </div>
      </Html>
    </group>
  );
}
export default RoomModel;
