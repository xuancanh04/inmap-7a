// ============================================================================
// InMap 7A — Thuật toán tìm đường A* (A-Star Pathfinding)
// ============================================================================

import type { NavNode, NavEdge } from '../types';

/** Tính khoảng cách Euclidean giữa 2 điểm trên mặt phẳng XZ */
function euclideanDistance(
  a: { x: number; z: number },
  b: { x: number; z: number }
): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Xây dựng adjacency list từ danh sách cạnh.
 * Mỗi cạnh là hai chiều (undirected graph).
 */
function buildAdjacencyList(
  edges: NavEdge[],
  nodes: NavNode[]
): Map<string, Array<{ neighborId: string; weight: number }>> {
  const nodeMap = new Map<string, NavNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const adj = new Map<string, Array<{ neighborId: string; weight: number }>>();

  // Khởi tạo mảng rỗng cho mỗi node
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) continue;

    // Tính trọng số: dùng weight được cung cấp, hoặc tính khoảng cách Euclidean
    const weight =
      edge.weight ?? euclideanDistance(fromNode.position, toNode.position);

    adj.get(edge.from)!.push({ neighborId: edge.to, weight });
    adj.get(edge.to)!.push({ neighborId: edge.from, weight });
  }

  return adj;
}

/**
 * Min-Heap đơn giản cho A* priority queue.
 * Sử dụng mảng và sắp xếp lại để đảm bảo tính đúng đắn.
 */
class MinHeap {
  private data: Array<{ nodeId: string; priority: number }> = [];

  push(nodeId: string, priority: number): void {
    this.data.push({ nodeId, priority });
    this._bubbleUp(this.data.length - 1);
  }

  pop(): { nodeId: string; priority: number } | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size(): number {
    return this.data.length;
  }

  private _bubbleUp(idx: number): void {
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.data[parentIdx].priority <= this.data[idx].priority) break;
      [this.data[parentIdx], this.data[idx]] = [
        this.data[idx],
        this.data[parentIdx],
      ];
      idx = parentIdx;
    }
  }

  private _sinkDown(idx: number): void {
    const length = this.data.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      if (
        left < length &&
        this.data[left].priority < this.data[smallest].priority
      ) {
        smallest = left;
      }
      if (
        right < length &&
        this.data[right].priority < this.data[smallest].priority
      ) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.data[smallest], this.data[idx]] = [
        this.data[idx],
        this.data[smallest],
      ];
      idx = smallest;
    }
  }
}

/**
 * Thuật toán A* tìm đường ngắn nhất.
 *
 * @param startId - ID nút xuất phát
 * @param goalId  - ID nút đích
 * @param nodes   - Danh sách tất cả NavNode
 * @param edges   - Danh sách tất cả NavEdge
 * @returns Mảng ID nodes tạo thành đường đi ngắn nhất, hoặc mảng rỗng nếu không tìm thấy.
 */
export function findShortestPath(
  startId: string,
  goalId: string,
  nodes: NavNode[],
  edges: NavEdge[]
): string[] {
  const nodeMap = new Map<string, NavNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const startNode = nodeMap.get(startId);
  const goalNode = nodeMap.get(goalId);
  if (!startNode || !goalNode) return [];

  const adj = buildAdjacencyList(edges, nodes);

  // g(n): chi phí thực từ start đến n
  const gScore = new Map<string, number>();
  // f(n) = g(n) + h(n) — ước lượng tổng chi phí
  const fScore = new Map<string, number>();
  // Truy vết đường đi
  const cameFrom = new Map<string, string>();

  const closedSet = new Set<string>();
  const openHeap = new MinHeap();

  // Khởi tạo
  gScore.set(startId, 0);
  fScore.set(startId, euclideanDistance(startNode.position, goalNode.position));
  openHeap.push(startId, fScore.get(startId)!);

  while (openHeap.size > 0) {
    const current = openHeap.pop()!;
    const currentId = current.nodeId;

    // Đã đến đích → truy vết đường đi
    if (currentId === goalId) {
      const path: string[] = [];
      let node: string | undefined = goalId;
      while (node !== undefined) {
        path.unshift(node);
        node = cameFrom.get(node);
      }
      return path;
    }

    if (closedSet.has(currentId)) continue;
    closedSet.add(currentId);

    const neighbors = adj.get(currentId) ?? [];
    for (const { neighborId, weight } of neighbors) {
      if (closedSet.has(neighborId)) continue;

      const tentativeG = (gScore.get(currentId) ?? Infinity) + weight;

      if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
        cameFrom.set(neighborId, currentId);
        gScore.set(neighborId, tentativeG);

        const neighborNode = nodeMap.get(neighborId)!;
        const h = euclideanDistance(neighborNode.position, goalNode.position);
        const f = tentativeG + h;
        fScore.set(neighborId, f);

        openHeap.push(neighborId, f);
      }
    }
  }

  // Không tìm thấy đường đi
  return [];
}
