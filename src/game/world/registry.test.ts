import { describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { panels } from "./registry";
import { validatePanels } from "./validate";
import { getStaticBackground, resolveBackground } from "./assets";

describe("world authoring", () => {
  it("has unique panel and hotspot IDs and valid geometry", () => {
    expect(validatePanels(panels)).toEqual([]);
  });
  it("reports malformed and duplicate definitions", () => {
    const panel = { ...panels[0]!, hotspots: [panels[0]!.hotspots[0]!, panels[0]!.hotspots[0]!] };
    expect(validatePanels([panel, panel]).join(" ")).toMatch(/Duplicate panel/);
    expect(validatePanels([panel]).join(" ")).toMatch(/Duplicate hotspot/);
    expect(validatePanels([{ ...panel, hotspots: [{ ...panel.hotspots[0]!, rect: { x: -1, y: 0, w: 2, h: 2 } }] }]).join(" ")).toMatch(/Out-of-range/);
  });
  it("only references shipped backgrounds and never probes the network", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    try {
      for (const panel of panels) {
        const path = getStaticBackground(panel.id);
        if (path) expect(existsSync(`public${path}`)).toBe(true);
        expect(await resolveBackground(panel.id)).toBe(path);
      }
      expect(fetch).not.toHaveBeenCalled();
    } finally { vi.unstubAllGlobals(); }
  });
});
