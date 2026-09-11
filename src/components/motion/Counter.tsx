"use client";

import { useRef } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";

type Props = {
  value: number;
  className?: string;
  trigger?: "load" | "scroll";
  delay?: number;
};

/**
 * Counts up to `value` (MASTER --d-count). Renders the final value in HTML,
 * so reduced motion and no-JS read correctly. Pair with an aria-label on the parent.
 */
export function Counter({ value, className, trigger = "scroll", delay = 0 }: Props) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const state = { n: 0 };
        el.textContent = "0";
        gsap.to(state, {
          n: value,
          duration: 1.2,
          delay,
          scrollTrigger: trigger === "scroll" ? { trigger: el, start: "top 85%", once: true } : undefined,
          onUpdate: () => {
            el.textContent = String(Math.round(state.n));
          },
        });
        return () => {
          el.textContent = String(value);
        };
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [value] },
  );

  return (
    <span ref={ref} className={className} aria-hidden>
      {value}
    </span>
  );
}
