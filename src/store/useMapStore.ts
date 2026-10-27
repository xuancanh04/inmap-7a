// ============================================================================
// InMap 7A — Zustand Global Store
// Quản lý trạng thái toàn cục: tầng, phòng, điều hướng, vị trí người dùng
// ============================================================================

import { create } from 'zustand';
import type { Room, NavNode, NavEdge, NavigationState, Point2D, Floor, BeaconDevice } from '../types';
import { findShortestPath } from '../utils/pathfinding';

export interface MapStoreState {
  // ── Dữ liệu tầng ──
  floors: Floor[];
  currentFloor: number;

  // ── Dữ liệu phòng ──
  rooms: Room[];

  // ── Thiết bị BLE Beacons DFRobot ──
  beacons: BeaconDevice[];
  showBeacons: boolean;
  isBleScanning: boolean;
  activeBeaconMinor: number | null;

  // ── Mạng lưới dẫn đường ──
  navNodes: NavNode[];
  navEdges: NavEdge[];

  // ── Vị trí người dùng & La bàn ──
  userPosition: Point2D | null;
  deviceHeading: number | null; // Góc xoay theo độ (0 - 360) từ cảm biến la bàn điện thoại
  isSimulatingWalk: boolean;

  // ── Điều hướng ──
  navigation: NavigationState;

  // ── Admin Tool ──
  adminMode: boolean;
  clickedCoords: Point2D[];

  // ── Visual 3D Room Builder ──
  builderMode: boolean;
  builderPoints: Point2D[];

  // ── Chế độ Toàn Cảnh Tòa Nhà 3 Tầng (3D Multi-Floor Stacking) ──
  building3DMode: boolean;

  // ── Actions ──
  setCurrentFloor: (floor: number) => void;
  toggleBuilding3DMode: () => void;
  setRooms: (rooms: Room[]) => void;
  addRoom: (room: Room) => void;
  removeRoom: (roomId: string) => void;
  setBeacons: (beacons: BeaconDevice[]) => void;
  toggleShowBeacons: () => void;
  setBleScanning: (scanning: boolean) => void;
  simulateNearestBeacon: (minor: number) => void;
  setNavData: (nodes: NavNode[], edges: NavEdge[]) => void;
  setUserPosition: (position: Point2D | null) => void;
  setDeviceHeading: (heading: number | null) => void;
  startSimulationWalk: () => void;
  stopSimulationWalk: () => void;
  setOrigin: (nodeId: string | null) => void;
  setDestination: (nodeId: string | null) => void;
  calculatePath: () => void;
  clearNavigation: () => void;
  /** Chọn phòng làm điểm đến → tự tìm node gần nhất rồi tính đường */
  navigateToRoom: (roomId: string) => void;

  // ── Admin Actions ──
  toggleAdminMode: () => void;
  addClickedCoord: (coord: Point2D) => void;
  removeClickedCoord: (index: number) => void;
  clearClickedCoords: () => void;

  // ── Builder Actions ──
  toggleBuilderMode: () => void;
  addBuilderPoint: (point: Point2D) => void;
  popBuilderPoint: () => void;
  clearBuilderPoints: () => void;
}

export const useMapStore = create<MapStoreState>((set, get) => ({
  // ── Initial State ──
  floors: [],
  currentFloor: 1,
  rooms: [],
  beacons: [],
  showBeacons: true,
  isBleScanning: false,
  activeBeaconMinor: null,
  navNodes: [],
  navEdges: [],
  userPosition: null,
  deviceHeading: null,
  isSimulatingWalk: false,
  navigation: {
    originNodeId: null,
    destinationNodeId: null,
    path: [],
  },
  adminMode: false,
  clickedCoords: [],
  builderMode: false,
  builderPoints: [],
  building3DMode: false, // Mặc định hiển thị mặt phẳng tầng 1 để định vị rõ ràng

  // ── Actions ──
  setCurrentFloor: (floor) => set({ currentFloor: floor }),
  toggleBuilding3DMode: () => set((state) => ({ building3DMode: !state.building3DMode })),

  setRooms: (rooms) => set({ rooms }),

  addRoom: (room) =>
    set((state) => ({
      rooms: [...state.rooms, room],
    })),

  removeRoom: (roomId) =>
    set((state) => ({
      rooms: state.rooms.filter((r) => r.id !== roomId),
    })),

  setBeacons: (beacons) => set({ beacons }),
  toggleShowBeacons: () => set((state) => ({ showBeacons: !state.showBeacons })),
  setBleScanning: (scanning) => set({ isBleScanning: scanning }),
  setDeviceHeading: (heading) => set({ deviceHeading: heading }),

  stopSimulationWalk: () => set({ isSimulatingWalk: false }),

  startSimulationWalk: () => {
    const { navigation, navNodes } = get();
    if (navigation.path.length < 2) return;

    set({ isSimulatingWalk: true });
    const nodeMap = new Map(navNodes.map((n) => [n.id, n]));
    const waypoints = navigation.path.map((id) => nodeMap.get(id)?.position).filter(Boolean) as Point2D[];

    let currentSegmentIndex = 0;
    let progress = 0;

    const interval = setInterval(() => {
      const state = get();
      if (!state.isSimulatingWalk || currentSegmentIndex >= waypoints.length - 1) {
        clearInterval(interval);
        set({ isSimulatingWalk: false });
        return;
      }

      const pA = waypoints[currentSegmentIndex];
      const pB = waypoints[currentSegmentIndex + 1];
      const dist = Math.hypot(pB.x - pA.x, pB.z - pA.z) || 1;
      const step = 0.35 / dist; // Tốc độ bước chân khoảng 1.2m/s
      progress += step;

      if (progress >= 1) {
        currentSegmentIndex += 1;
        progress = 0;
        if (currentSegmentIndex >= waypoints.length - 1) {
          set({ userPosition: waypoints[waypoints.length - 1], isSimulatingWalk: false });
          clearInterval(interval);
          return;
        }
      }

      const currA = waypoints[currentSegmentIndex];
      const currB = waypoints[currentSegmentIndex + 1];
      const curX = currA.x + (currB.x - currA.x) * progress;
      const curZ = currA.z + (currB.z - currA.z) * progress;

      // Tính góc quay theo hướng bước chân
      const angleDeg = ((Math.atan2(currB.x - currA.x, currB.z - currA.z) * 180) / Math.PI + 360) % 360;

      set({
        userPosition: { x: curX, z: curZ },
        deviceHeading: angleDeg,
      });
    }, 50);
  },


  simulateNearestBeacon: (minor) => {
    const { beacons, navNodes, currentFloor } = get();
    const beacon = beacons.find((b) => b.minor === minor);
    if (!beacon) return;

    // Cập nhật vị trí người dùng theo beacon
    set({
      userPosition: beacon.position,
      activeBeaconMinor: minor,
    });

    // Tự động tìm NavNode gần nhất làm originNodeId và tính lại đường đi nếu đã chọn điểm đến
    const floorNodes = navNodes.filter((n) => n.floor === currentFloor);
    let nearestNode: NavNode | null = null;
    let minDist = Infinity;

    for (const node of floorNodes) {
      const dist = Math.hypot(node.position.x - beacon.position.x, node.position.z - beacon.position.z);
      if (dist < minDist) {
        minDist = dist;
        nearestNode = node;
      }
    }

    if (nearestNode) {
      set((state) => ({
        navigation: { ...state.navigation, originNodeId: nearestNode!.id },
      }));
      get().calculatePath();
    }
  },

  setNavData: (nodes, edges) => set({ navNodes: nodes, navEdges: edges }),

  setUserPosition: (position) => set({ userPosition: position }),

  setOrigin: (nodeId) =>
    set((state) => ({
      navigation: { ...state.navigation, originNodeId: nodeId, path: [] },
    })),

  setDestination: (nodeId) =>
    set((state) => ({
      navigation: { ...state.navigation, destinationNodeId: nodeId, path: [] },
    })),

  calculatePath: () => {
    const { navigation, navNodes, navEdges, currentFloor } = get();
    const { originNodeId, destinationNodeId } = navigation;

    if (!originNodeId || !destinationNodeId) {
      set((state) => ({ navigation: { ...state.navigation, path: [] } }));
      return;
    }

    // Lọc nodes & edges theo tầng hiện tại
    const floorNodes = navNodes.filter((n) => n.floor === currentFloor);
    const floorNodeIds = new Set(floorNodes.map((n) => n.id));
    const floorEdges = navEdges.filter(
      (e) => floorNodeIds.has(e.from) && floorNodeIds.has(e.to)
    );

    const path = findShortestPath(
      originNodeId,
      destinationNodeId,
      floorNodes,
      floorEdges
    );

    set((state) => ({ navigation: { ...state.navigation, path } }));
  },

  clearNavigation: () =>
    set({
      navigation: {
        originNodeId: null,
        destinationNodeId: null,
        path: [],
      },
    }),

  navigateToRoom: (roomId) => {
    const { navNodes, currentFloor, userPosition } = get();
    const floorNodes = navNodes.filter((n) => n.floor === currentFloor);

    // Tìm node đích liên kết với phòng
    const destNode = floorNodes.find((n) => n.roomId === roomId);
    if (!destNode) return;

    // Tìm node xuất phát gần vị trí người dùng nhất
    let originNode: NavNode | null = null;
    if (userPosition) {
      let minDist = Infinity;
      for (const node of floorNodes) {
        const dx = node.position.x - userPosition.x;
        const dz = node.position.z - userPosition.z;
        const dist = dx * dx + dz * dz;
        if (dist < minDist) {
          minDist = dist;
          originNode = node;
        }
      }
    } else {
      // Không có vị trí → lấy node đầu tiên làm mặc định
      originNode = floorNodes[0] ?? null;
    }

    if (!originNode) return;

    set((state) => ({
      navigation: {
        ...state.navigation,
        originNodeId: originNode!.id,
        destinationNodeId: destNode.id,
        path: [],
      },
    }));

    // Tính đường đi sau khi set origin/dest
    get().calculatePath();
  },

  // ── Admin Actions ──
  toggleAdminMode: () => set((state) => ({ adminMode: !state.adminMode })),

  addClickedCoord: (coord) =>
    set((state) => ({
      clickedCoords: [...state.clickedCoords, coord].slice(-20), // Giữ tối đa 20 điểm
    })),

  removeClickedCoord: (index) =>
    set((state) => ({
      clickedCoords: state.clickedCoords.filter((_, i) => i !== index),
    })),

  clearClickedCoords: () => set({ clickedCoords: [] }),

  // ── Builder Actions ──
  toggleBuilderMode: () =>
    set((state) => ({
      builderMode: !state.builderMode,
      // Khi bật builder thì tắt admin và ngược lại để tránh xung đột
      ...(state.builderMode ? {} : { adminMode: false }),
    })),

  addBuilderPoint: (point) =>
    set((state) => ({
      builderPoints: [...state.builderPoints, point],
    })),

  popBuilderPoint: () =>
    set((state) => ({
      builderPoints: state.builderPoints.slice(0, -1),
    })),

  clearBuilderPoints: () => set({ builderPoints: [] }),
}));
