import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useMapStore } from '../store/useMapStore';
import { RoomModel } from './RoomModel';
import { FloorPlan } from './FloorPlan';

const FLOOR_HEIGHT_STEP = 7.5;

interface MultiFloorBuildingProps {
  width: number;
  depth: number;
}

export function MultiFloorBuilding({ width, depth }: MultiFloorBuildingProps) {
  const floors = useMapStore((s) => s.floors);
  const currentFloor = useMapStore((s) => s.currentFloor);
  const setCurrentFloor = useMapStore((s) => s.setCurrentFloor);
  const rooms = useMapStore((s) => s.rooms);
  const adminMode = useMapStore((s) => s.adminMode);
  const builderMode = useMapStore((s) => s.builderMode);

  const floorList = useMemo(() => {
    return [0, 1, 2].map((fId) => {
      const fl = floors.find((f) => f.id === fId);
      const floorRooms = rooms.filter((r) => r.floor === fId);
      const yOffset = fId * FLOOR_HEIGHT_STEP;
      return {
        id: fId,
        name: fl?.name ?? `Tầng ${fId}`,
        rooms: floorRooms,
        yOffset,
      };
    });
  }, [floors, rooms]);

  const centerX = width / 2;
  const centerZ = depth / 2;

  return (
    <group name="multi-floor-hospital-building">
      {floorList.map((f) => {
        const isCurrent = currentFloor === f.id;

        return (
          <group
            key={`floor-group-${f.id}`}
            position={[0, f.yOffset, 0]}
          >
            {}
            <FloorPlan
              width={width}
              depth={depth}
              adminMode={isCurrent && adminMode}
              builderMode={isCurrent && builderMode}
              floorId={f.id}
            />

            {}
            <group>
              {f.rooms.map((room) => (
                <RoomModel key={room.id} room={room} wallHeight={2.8} />
              ))}
            </group>

            {}
            <mesh
              position={[centerX, -0.15, centerZ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[width + 1.2, depth + 1.2]} />
              <meshStandardMaterial
                color={isCurrent ? '#38bdf8' : '#334155'}
                transparent
                opacity={isCurrent ? 0.35 : 0.15}
                roughness={0.1}
                metalness={0.8}
                side={THREE.DoubleSide}
              />
            </mesh>

            {}
            <Html
              position={[-4, 2.5, centerZ]}
              center
              distanceFactor={32}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentFloor(f.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all duration-300 shadow-2xl border backdrop-blur-md select-none ${
                  isCurrent
                    ? 'bg-sky-500 text-white border-sky-300 ring-4 ring-sky-400/40 shadow-sky-500/50 scale-110'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:border-sky-400/50 hover:bg-slate-800'
                }`}
                title={`Bấm để chọn ${f.name}`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow" />
                <span>{f.id === 0 ? 'Tầng Trệt' : `Tầng ${f.id}`}</span>
                {isCurrent && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">Đang chọn</span>}
              </div>
            </Html>
          </group>
        );
      })}

      {}
      {[
        [-0.5, -0.5],
        [width + 0.5, -0.5],
        [-0.5, depth + 0.5],
        [width + 0.5, depth + 0.5],
      ].map(([px, pz], idx) => (
        <mesh
          key={`pillar-${idx}`}
          position={[px, (2 * FLOOR_HEIGHT_STEP) / 2 + 1.4, pz]}
        >
          <cylinderGeometry args={[0.35, 0.35, 2 * FLOOR_HEIGHT_STEP + 3, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.35}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

export default MultiFloorBuilding;
