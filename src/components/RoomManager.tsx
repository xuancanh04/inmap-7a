// ============================================================================
// InMap 7A — RoomManager.tsx
// Component quản lý & tự động dựng hàng loạt các khối phòng 3D (Batch Extrude)
// ============================================================================

import { useMemo } from 'react';
import { RoomModel } from './RoomModel';
import { useMapStore } from '../store/useMapStore';

interface RoomManagerProps {
  /** Chiều cao tường cho các phòng (mặc định: 2.5m) */
  wallHeight?: number;
}

/**
 * Component RoomManager:
 * - Lắng nghe danh sách phòng trong Zustand store (`rooms`).
 * - Tự động lọc các phòng thuộc tầng hiện tại (`currentFloor`).
 * - Tự động gọi RoomModel để đùn khối 3D (Batch Extrude) ngay khi phòng được thêm mới.
 */
export function RoomManager({ wallHeight = 2.5 }: RoomManagerProps) {
  const rooms = useMapStore((s) => s.rooms);
  const currentFloor = useMapStore((s) => s.currentFloor);

  // Lọc danh sách phòng theo tầng đang kích hoạt
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
