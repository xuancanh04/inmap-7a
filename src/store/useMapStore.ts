import { create } from 'zustand';
import type { Room, NavNode, NavEdge, NavigationState, Point2D, Floor, BeaconDevice } from '../types';
import { findShortestPath } from '../utils/pathfinding';

export interface MapStoreState {

  floors: Floor[];
  currentFloor: number;

  rooms: Room[];

  beacons: BeaconDevice[];
  showBeacons: boolean;
  isBleScanning: boolean;
  activeBeaconMinor: number | null;

  navNodes: NavNode[];
  navEdges: NavEdge[];

  userPosition: Point2D | null;
  deviceHeading: number | null;
  isSimulatingWalk: boolean;

  navigation: NavigationState;
  isFollowingUser: boolean;
  cameraRotationAngle: number;
  setCameraRotationAngle: (angle: number) => void;
  resetNorthTrigger: number;
  triggerResetNorth: () => void;
  recenterUserTrigger: number;
  triggerRecenterUser: () => void;
  zoomInTrigger: number;
  triggerZoomIn: () => void;
  zoomOutTrigger: number;
  triggerZoomOut: () => void;

  adminMode: boolean;
  clickedCoords: Point2D[];

  builderMode: boolean;
  builderPoints: Point2D[];

  building3DMode: boolean;

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

  navigateToRoom: (roomId: string) => void;
  setIsFollowingUser: (following: boolean) => void;

  toggleAdminMode: () => void;
  addClickedCoord: (coord: Point2D) => void;
  removeClickedCoord: (index: number) => void;
  clearClickedCoords: () => void;

  toggleBuilderMode: () => void;
  addBuilderPoint: (point: Point2D) => void;
  popBuilderPoint: () => void;
  clearBuilderPoints: () => void;
}

export const useMapStore = create<MapStoreState>((set, get) => ({

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
  isFollowingUser: false,
  cameraRotationAngle: 0,
  setCameraRotationAngle: (angle) => set({ cameraRotationAngle: angle }),
  resetNorthTrigger: 0,
  triggerResetNorth: () => set((s) => ({ resetNorthTrigger: s.resetNorthTrigger + 1 })),
  recenterUserTrigger: 0,
  triggerRecenterUser: () => set((s) => ({ recenterUserTrigger: s.recenterUserTrigger + 1, isFollowingUser: true })),
  zoomInTrigger: 0,
  triggerZoomIn: () => set((s) => ({ zoomInTrigger: s.zoomInTrigger + 1 })),
  zoomOutTrigger: 0,
  triggerZoomOut: () => set((s) => ({ zoomOutTrigger: s.zoomOutTrigger + 1 })),
  adminMode: false,
  clickedCoords: [],
  builderMode: false,
  builderPoints: [],
  building3DMode: false,

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
      const step = 0.35 / dist;
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

    set({
      userPosition: beacon.position,
      activeBeaconMinor: minor,
    });

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
      isFollowingUser: false,
  cameraRotationAngle: 0,
  setCameraRotationAngle: (angle) => set({ cameraRotationAngle: angle }),
  resetNorthTrigger: 0,
  triggerResetNorth: () => set((s) => ({ resetNorthTrigger: s.resetNorthTrigger + 1 })),
  recenterUserTrigger: 0,
  triggerRecenterUser: () => set((s) => ({ recenterUserTrigger: s.recenterUserTrigger + 1, isFollowingUser: true })),
  zoomInTrigger: 0,
  triggerZoomIn: () => set((s) => ({ zoomInTrigger: s.zoomInTrigger + 1 })),
  zoomOutTrigger: 0,
  triggerZoomOut: () => set((s) => ({ zoomOutTrigger: s.zoomOutTrigger + 1 })),
    }),

  setIsFollowingUser: (following) => set({ isFollowingUser: following }),

  navigateToRoom: (roomId) => {
    const { navNodes, currentFloor, userPosition } = get();
    const floorNodes = navNodes.filter((n) => n.floor === currentFloor);

    const destNode = floorNodes.find((n) => n.roomId === roomId);
    if (!destNode) return;

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

    get().calculatePath();
  },

  toggleAdminMode: () => set((state) => ({ adminMode: !state.adminMode })),

  addClickedCoord: (coord) =>
    set((state) => ({
      clickedCoords: [...state.clickedCoords, coord].slice(-20),
    })),

  removeClickedCoord: (index) =>
    set((state) => ({
      clickedCoords: state.clickedCoords.filter((_, i) => i !== index),
    })),

  clearClickedCoords: () => set({ clickedCoords: [] }),

  toggleBuilderMode: () =>
    set((state) => ({
      builderMode: !state.builderMode,

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
