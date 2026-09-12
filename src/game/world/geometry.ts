/**
 * Route maths for the detective-track world map.
 *
 * Approach copied from `src/features/districts/geometry.ts` (reference only —
 * we do not import or edit the original). Adapted for the five detective-track
 * panels instead of the six district route.
 *
 * ViewBox: 800 × 400. Panels are laid out left-to-right in investigation order.
 */

import type { LocationId } from "@/game/world/types";

export interface Point {
  x: number;
  y: number;
}

/** Panel positions within the 800×400 viewBox. */
export const PANEL_POSITIONS: Record<LocationId, Point> = {
  office:           { x: 100, y: 200 },
  "victim-flat":    { x: 260, y: 200 },
  "bank-branch":    { x: 420, y: 200 },
  "repair-shop":    { x: 580, y: 200 },
  "police-station": { x: 740, y: 200 },
};

/** Investigation order. */
export const PANEL_ORDER: readonly LocationId[] = [
  "office",
  "victim-flat",
  "bank-branch",
  "repair-shop",
  "police-station",
];

/** Route segments between consecutive panels (viewBox 800×400). */
export const ROUTE_SEGMENTS: string[] = [
  "100,200 180,140 260,200",
  "260,200 340,260 420,200",
  "420,200 500,140 580,200",
  "580,200 660,260 740,200",
];

/** The whole route as one polyline through every panel, in order. */
const parse = (points: string): Point[] =>
  points.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x: x!, y: y! };
  });

export const ROUTE_VERTICES: Point[] = ROUTE_SEGMENTS.flatMap((s, i) =>
  i === 0 ? parse(s) : parse(s).slice(1),
);

export const ROUTE_PATH = `M${ROUTE_VERTICES.map((p) => `${p.x} ${p.y}`).join(" L")}`;

const CUMULATIVE = ROUTE_VERTICES.reduce<number[]>((acc, p, i) => {
  const prev = ROUTE_VERTICES[i - 1];
  acc.push(prev ? acc[i - 1]! + Math.hypot(p.x - prev.x, p.y - prev.y) : 0);
  return acc;
}, []);

export const ROUTE_LENGTH = CUMULATIVE.at(-1)!;

/** How far along the route each panel sits. */
export const PANEL_LENGTHS: Record<LocationId, number> = Object.fromEntries(
  PANEL_ORDER.map((id) => {
    const pos = PANEL_POSITIONS[id];
    const i = ROUTE_VERTICES.findIndex((v) => v.x === pos.x && v.y === pos.y);
    return [id, i >= 0 ? CUMULATIVE[i]! : 0];
  }),
) as Record<LocationId, number>;

/** The point `length` units along the route. */
export function pointAtLength(length: number): Point {
  const l = Math.max(0, Math.min(ROUTE_LENGTH, length));
  let k = 0;
  while (k < CUMULATIVE.length - 2 && CUMULATIVE[k + 1]! < l) k++;
  const a = ROUTE_VERTICES[k]!;
  const b = ROUTE_VERTICES[k + 1]!;
  const span = CUMULATIVE[k + 1]! - CUMULATIVE[k]!;
  const t = span ? (l - CUMULATIVE[k]!) / span : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/**
 * Where the map's pointer sits for a panel-index progress.
 * 0 = first panel (office), 4 = last (police-station).
 */
export function routeAt(progress: number): Point & { length: number } {
  const last = PANEL_ORDER.length - 1;
  const p = Math.max(0, Math.min(last, progress));
  const i = Math.floor(p);
  const j = Math.min(last, i + 1);
  const li = PANEL_LENGTHS[PANEL_ORDER[i]!]!;
  const lj = PANEL_LENGTHS[PANEL_ORDER[j]!]!;
  const length = li + (lj - li) * (p - i);
  return { ...pointAtLength(length), length };
}
