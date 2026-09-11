"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";

type Props = {
  as?: "h1" | "h2" | "h3" | "p" | "div";
  /** One entry per line, broken by hand (MASTER §2). */
  lines: React.ReactNode[];
  className?: string;
  lineClassName?: string;
  id?: string;
  /** "load" plays on mount (above the fold); "scroll" plays once on enter. */
  trigger?: "load" | "scroll";
  delay?: number;
  start?: string;
};

/**
 * Masked line reveal: each line rises out of its own clip (MASTER §4.1).
 * Lines are real text in the DOM, so screen readers get the full sentence.
 */
export function SplitReveal({
  as = "h2",
  lines,
  className,
  lineClassName,
  id,
  trigger = "scroll",
  delay = 0,
  start = "top 80%",
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
          el.querySelectorAll("[data-reveal-line]"),
          // y: 0 overrides the px offset GSAP parses from the CSS start-state.
          { yPercent: 150, y: 0 },
          {
            yPercent: 0,
            y: 0,
            duration: 1.1,
            stagger: 0.09,
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
    <Comp ref={ref as React.RefObject<never>} id={id} className={className}>
      {lines.map((line, i) => (
        <span key={i} className="split-mask block overflow-hidden">
          <span data-reveal-line className={cn("block will-change-transform", lineClassName)}>
            {line}
          </span>{" "}
        </span>
      ))}
    </Comp>
  );
}
