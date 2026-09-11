"use client";

import { useEffect, useRef, useState } from "react";
import { SECTION_TOTAL } from "@/content/sections";
import { cn } from "@/lib/cn";
import { ScrollTrigger } from "@/lib/motion/gsap";
import { lightToneClass, useToneUnder } from "@/lib/tone";

/**
 * Scroll-progress hairline + section counter (MASTER §5). Landing page only.
 * Decorative: the index dialog is the accessible equivalent.
 */
export function ScrollProgress() {
  const fill = useRef<HTMLSpanElement>(null);
  const [current, setCurrent] = useState("01");
  const tone = useToneUnder(() => ({ x: window.innerWidth - 24, y: window.innerHeight / 2 }));

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        if (fill.current) fill.current.style.transform = `scaleY(${self.progress})`;
      },
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const n = (entry.target as HTMLElement).dataset.section;
          if (entry.isIntersecting && n) setCurrent(n);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    document.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));

    return () => {
      trigger.kill();
      observer.disconnect();
    };
  }, []);

  return (
    <div
      aria-hidden
      data-chrome
      className={cn(
        "pointer-events-none fixed top-1/2 right-4 z-[70] hidden -translate-y-1/2 items-center gap-3 md:flex",
        lightToneClass(tone),
      )}
    >
      <span className="meta tabular text-smoke transition-colors duration-[320ms] [writing-mode:vertical-rl]">
        {current} / {SECTION_TOTAL}
      </span>
      <span className="relative block h-40 w-px bg-line transition-colors duration-[320ms]">
        <span ref={fill} className="absolute inset-0 origin-top bg-bone" style={{ transform: "scaleY(0)" }} />
      </span>
    </div>
  );
}
