import { describe, expect, it } from "vitest";
import { DISTRICTS } from "@/content/districts";
import { DISTRICT_LENGTHS, ROUTE_LENGTH, routeAt } from "@/features/districts/geometry";

describe("the city map's route", () => {
  it("passes through every district, in order", () => {
    expect(DISTRICT_LENGTHS).toHaveLength(DISTRICTS.length);
    for (let i = 1; i < DISTRICT_LENGTHS.length; i++) expect(DISTRICT_LENGTHS[i]).toBeGreaterThan(DISTRICT_LENGTHS[i - 1]!);
    expect(DISTRICT_LENGTHS.at(-1)).toBeCloseTo(ROUTE_LENGTH);
  });

  it("puts the pointer exactly on a district at whole positions", () => {
    DISTRICTS.forEach((d, i) => expect(routeAt(i)).toMatchObject({ x: d.map.x, y: d.map.y }));
  });

  it("glides along the road between districts, round the corners", () => {
    // Bank (130,120) → Delivery (230,380) goes down to (130,280) first: halfway is still on that first leg.
    const half = routeAt(0.5);
    expect(half.x).toBeCloseTo(130);
    expect(half.y).toBeGreaterThan(120);
    expect(half.y).toBeLessThan(280);
    // Out-of-range scroll clamps to the ends.
    expect(routeAt(-1)).toMatchObject({ x: 130, y: 120 });
    expect(routeAt(99)).toMatchObject({ x: DISTRICTS.at(-1)!.map.x, y: DISTRICTS.at(-1)!.map.y });
  });
});
