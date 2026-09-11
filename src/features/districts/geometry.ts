import { DISTRICTS } from "@/content/districts";

/** Route segments between consecutive districts (viewBox 800×500), transit-map style. */
export const ROUTE_SEGMENTS = [
  "130,120 130,280 230,380",
  "230,380 430,380",
  "430,380 560,250",
  "560,250 560,100",
  "560,100 690,100 690,300",
];
/** The bonus call sits on a spur off the Bank. */
export const SPUR = "130,120 300,120";

type Point = { x: number; y: number };

const parse = (points: string) =>
  points.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return { x: x!, y: y! };
  });

/** The whole route as one line through every district, in order. */
export const ROUTE_VERTICES: Point[] = ROUTE_SEGMENTS.flatMap((s, i) => (i === 0 ? parse(s) : parse(s).slice(1)));
export const ROUTE_PATH = `M${ROUTE_VERTICES.map((p) => `${p.x} ${p.y}`).join(" L")}`;

const CUMULATIVE = ROUTE_VERTICES.reduce<number[]>((acc, p, i) => {
  const prev = ROUTE_VERTICES[i - 1];
  acc.push(prev ? acc[i - 1]! + Math.hypot(p.x - prev.x, p.y - prev.y) : 0);
  return acc;
}, []);
export const ROUTE_LENGTH = CUMULATIVE.at(-1)!;

/** How far along the route each district sits, in route order. */
export const DISTRICT_LENGTHS = DISTRICTS.map((d) => {
  const i = ROUTE_VERTICES.findIndex((v) => v.x === d.map.x && v.y === d.map.y);
  if (i < 0) throw new Error(`District ${d.id} is not on the route`);
  return CUMULATIVE[i]!;
});

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
 * Where the map's pointer sits for a scroll position: 0 is the first district,
 * `DISTRICTS.length - 1` the last, and fractions glide along the real route
 * between them (round the corners, not across the river).
 */
export function routeAt(progress: number) {
  const last = DISTRICTS.length - 1;
  const p = Math.max(0, Math.min(last, progress));
  const i = Math.floor(p);
  const j = Math.min(last, i + 1);
  const length = DISTRICT_LENGTHS[i]! + (DISTRICT_LENGTHS[j]! - DISTRICT_LENGTHS[i]!) * (p - i);
  return { ...pointAtLength(length), length };
}
