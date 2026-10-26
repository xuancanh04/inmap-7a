// ============================================================================
// InMap 7A — Hệ thống bản đồ 3D dẫn đường trong nhà
// Type Definitions
// ============================================================================

/** Tọa độ 2D trên mặt phẳng XZ (y=0 là sàn nhà) */
export interface Point2D {
  x: number;
  z: number;
}

/** Đỉnh polygon cho hình dạng phòng */
export interface PolygonVertex {
  x: number;
  z: number;
}

/** Thông tin một phòng trên bản đồ */
export interface Room {
  id: string;
  name: string;
  floor: number;
  /** Mảng các đỉnh polygon mô tả hình dạng phòng trên mặt sàn */
  polygon: PolygonVertex[];
  /** Màu sắc hiển thị (hex string) */
  color: string;
  /** Tọa độ trung tâm phòng (dùng để gắn nhãn & làm điểm đến) */
  center: Point2D;
  /** Mô tả/ghi chú thêm về phòng */
  description?: string;
  /** Loại phòng */
  type?: 'office' | 'medical' | 'utility' | 'public' | 'corridor' | 'pharmacy' | 'elevator';
  /** Có bỏ tường không (không dựng tường bao quanh, chỉ lát sàn và đặt nội thất / ghế chờ) */
  noWall?: boolean;
  /** Hướng mở cửa phòng: 'north' (lên), 'south' (xuống), 'east' (phải), 'west' (trái), hoặc 'none' */
  doorSide?: 'north' | 'south' | 'east' | 'west' | 'none' | 'auto';
  /** Danh sách các hướng mở cửa khi phòng có nhiều cửa */
  doorSides?: ('north' | 'south' | 'east' | 'west')[];
  /** Số lượng cửa trên cạnh mở (mặc định: 1) */
  doorCount?: number;
  /** Tọa độ chính xác của tâm từng cánh cửa khớp 100% bản vẽ 2D { x, z } */
  doorPositions?: Point2D[];
}

/** Nút giao thông trên mạng lưới đường đi */
export interface NavNode {
  id: string;
  position: Point2D;
  floor: number;
  /** ID phòng liên kết (nếu nút nằm tại cửa/bên trong phòng) */
  roomId?: string;
  /** Nhãn mô tả (ví dụ: "Cửa phòng hành chính", "Ngã rẽ hành lang") */
  label?: string;
}

/** Cạnh nối giữa 2 nút giao thông */
export interface NavEdge {
  /** ID nút nguồn */
  from: string;
  /** ID nút đích */
  to: string;
  /** Trọng số / khoảng cách (tính tự động nếu không truyền vào) */
  weight?: number;
}

/** Thông tin một tầng */
export interface Floor {
  id: number;
  name: string;
  /** Đường dẫn đến hình ảnh bản vẽ mặt bằng tầng */
  planImageUrl?: string;
  /** Kích thước mặt sàn (mét) */
  width: number;
  depth: number;
}

/** Trạng thái điểm dẫn đường */
export interface NavigationState {
  originNodeId: string | null;
  destinationNodeId: string | null;
  /** Đường đi đã tìm được (mảng ID nodes theo thứ tự) */
  path: string[];
}
