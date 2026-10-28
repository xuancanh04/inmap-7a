import type { Point2D, PolygonVertex } from '../types';

export function calculatePolygonCentroid(vertices: PolygonVertex[]): Point2D {
  if (!vertices || vertices.length === 0) {
    return { x: 0, z: 0 };
  }
  if (vertices.length === 1) {
    return { x: vertices[0].x, z: vertices[0].z };
  }
  if (vertices.length === 2) {
    return {
      x: Math.round(((vertices[0].x + vertices[1].x) / 2) * 100) / 100,
      z: Math.round(((vertices[0].z + vertices[1].z) / 2) * 100) / 100,
    };
  }

  let signedArea = 0;
  let cx = 0;
  let cz = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const current = vertices[i];
    const next = vertices[(i + 1) % n];

    const cross = current.x * next.z - next.x * current.z;
    signedArea += cross;
    cx += (current.x + next.x) * cross;
    cz += (current.z + next.z) * cross;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-5) {
    const sum = vertices.reduce(
      (acc, v) => ({ x: acc.x + v.x, z: acc.z + v.z }),
      { x: 0, z: 0 }
    );
    return {
      x: Math.round((sum.x / n) * 100) / 100,
      z: Math.round((sum.z / n) * 100) / 100,
    };
  }

  cx = cx / (6 * signedArea);
  cz = cz / (6 * signedArea);

  return {
    x: Math.round(cx * 100) / 100,
    z: Math.round(cz * 100) / 100,
  };
}

export function calculatePolygonArea(vertices: PolygonVertex[]): number {
  if (!vertices || vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const cur = vertices[i];
    const nxt = vertices[(i + 1) % n];
    area += cur.x * nxt.z - nxt.x * cur.z;
  }
  return Math.round(Math.abs(area / 2) * 10) / 10;
}
