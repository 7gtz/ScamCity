"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { gsap, MQ, ScrollTrigger } from "@/lib/motion/gsap";
import { setLenis } from "@/lib/motion/lenis";

/** Lenis for the marketing scroll only, synced to ScrollTrigger (MASTER §4). */
export function SmoothScroll() {
  useEffect(() => {
    // Fonts change line breaks, which changes every trigger position.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    if (window.matchMedia(MQ.reduced).matches) return;

    // Hash links go through scrollToTarget(), so Lenis' own anchor handling stays off.
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);

    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  return null;
}
