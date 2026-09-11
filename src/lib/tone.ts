"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type Tone = "dark" | "ember" | "paper" | "amber";

/** Class that remaps the palette for a light tone (dark and ember need no remap for chrome). */
export const lightToneClass = (tone: Tone) => (tone === "paper" ? "tone-paper" : tone === "amber" ? "tone-amber" : "");

/**
 * The tone of whatever sits under a viewport point, ignoring the fixed chrome
 * itself ([data-chrome]). Pointer-events-none layers are skipped by the browser.
 */
export function toneAt(x: number, y: number): Tone {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.closest("[data-chrome]")) continue;
    const tone = (el.closest("[data-tone]") as HTMLElement | null)?.dataset.tone as Tone | undefined;
    return tone ?? "dark";
  }
  return "dark";
}

/**
 * Keeps fixed chrome (nav, scroll hairline) legible over light and dark
 * sections: re-reads the tone under a probe point on scroll, resize and route change.
 */
export function useToneUnder(probe: () => { x: number; y: number }): Tone {
  const [tone, setTone] = useState<Tone>("dark");
  const pathname = usePathname();
  const probeRef = useRef(probe);
  useEffect(() => {
    probeRef.current = probe;
  });

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const { x, y } = probeRef.current();
        setTone(toneAt(x, y));
      });
    };
    update();
    const settle = setTimeout(update, 450); // after the new route has painted
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return tone;
}
