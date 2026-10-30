export interface Point2D {
  x: number;
  z: number;
  hasFrame?: boolean;
}

export interface PolygonVertex {
  x: number;
  z: number;
}

export interface Room {
  id: string;
  name: string;
  floor: number;

  polygon: PolygonVertex[];

  color: string;

  center: Point2D;

  description?: string;

  type?: 'office' | 'medical' | 'utility' | 'public' | 'corridor' | 'pharmacy' | 'elevator';

  noWall?: boolean;

  doorSide?: 'north' | 'south' | 'east' | 'west' | 'none' | 'auto';

  doorSides?: ('north' | 'south' | 'east' | 'west')[];

  doorCount?: number;

  doorPositions?: Point2D[];
  showDoorFrame?: boolean;
}

export interface NavNode {
  id: string;
  position: Point2D;
  floor: number;

  roomId?: string;

  label?: string;
}

export interface NavEdge {

  from: string;

  to: string;

  weight?: number;
}

export interface Floor {
  id: number;
  name: string;

  planImageUrl?: string;

  width: number;
  depth: number;
}

export interface NavigationState {
  originNodeId: string | null;
  destinationNodeId: string | null;

  path: string[];
}

export interface BeaconDevice {
  id: string;
  name: string;
  uuid: string;
  major: number;
  minor: number;
  macAddress?: string;
  txPower: number;
  position: Point2D;
  floor: number;
  color?: string;
  active?: boolean;
}

export interface BleScanReading {
  minor: number;
  rssi: number;
  distance: number;
}
