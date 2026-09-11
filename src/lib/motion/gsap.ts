import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

/** The one curve (MASTER §4). Mirrors --ease: cubic-bezier(0.16, 1, 0.3, 1). */
export const EASE = "scam";
export const EASE_EXIT = "scamExit";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  CustomEase.create(EASE, "0.16, 1, 0.3, 1");
  CustomEase.create(EASE_EXIT, "0.7, 0, 0.84, 0");
  gsap.defaults({ ease: EASE, duration: 0.9 });
}

/** Media conditions shared by every gsap.matchMedia() call. */
export const MQ = {
  motion: "(prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
  desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
} as const;

export { gsap, ScrollTrigger, SplitText, useGSAP };
