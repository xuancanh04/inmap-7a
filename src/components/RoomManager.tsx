import { useMemo } from 'react';
import { RoomModel } from './RoomModel';
import { useMapStore } from '../store/useMapStore';

interface RoomManagerProps {

  wallHeight?: number;
}

export function RoomManager({ wallHeight = 2.5 }: RoomManagerProps) {
  const rooms = useMapStore((s) => s.rooms);
  const currentFloor = useMapStore((s) => s.currentFloor);

  const currentFloorRooms = useMemo(
    () => rooms.filter((r) => r.floor === currentFloor),
    [rooms, currentFloor]
  );

  return (
    <group name="room-manager-batch">
      {currentFloorRooms.map((room) => (
        <RoomModel key={room.id} room={room} wallHeight={wallHeight} />
      ))}
    </group>
  );
}

export default RoomManager;
