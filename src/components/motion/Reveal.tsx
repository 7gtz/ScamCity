"use client";

import { useRef } from "react";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";

type Props = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol" | "section" | "footer";
  stagger?: number;
  y?: number;
  start?: string;
  delay?: number;
  /** "load" plays on mount (above the fold); "scroll" plays once on enter. */
  trigger?: "load" | "scroll";
};

/**
 * Staggered enter for supporting content. Mark each child with `data-reveal`.
 * Plays once; never more than ~8 children per group (stagger stays tight).
 */
export function Reveal({
  children,
  className,
  as = "div",
  stagger = 0.08,
  y = 20,
  start = "top 85%",
  delay = 0,
  trigger = "scroll",
}: Props) {
  const ref = useRef<HTMLElement>(null);
  const Comp: React.ElementType = as;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.fromTo(
          el.querySelectorAll("[data-reveal]"),
          { opacity: 0, y },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger,
            delay,
            scrollTrigger: trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    // Polymorphic tag: the ref is valid for any of the allowed elements.
    <Comp ref={ref as React.RefObject<never>} className={className}>
      {children}
    </Comp>
  );
}
