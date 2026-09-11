"use client";

import { useRef } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { DISTRICTS } from "@/content/districts";
import { CityMap, useCityProgress } from "@/features/districts/CityMap";
import { RIDDLES_TO_UNLOCK, useProgressStore } from "@/features/progress/progress-store";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { Section, SectionMeta } from "./Section";

/**
 * Your city: progression as a transit map, not a list (brief §18). Six
 * districts on one line; clearing one opens the next. The legitimate call is a
 * bonus on a spur — riddles open it early. The same map the district plates
 * open as an overlay (`CityMap`).
 */
export function Progression() {
  const { clearedCount, riddle } = useCityProgress();
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const st = { trigger: el, start: "top 70%", once: true };
        gsap.fromTo("[data-route]", { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.7, stagger: 0.35, ease: "none", scrollTrigger: st });
        gsap.fromTo("[data-node]", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, scrollTrigger: st });
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section id="progression" className="gutter-x py-[var(--section)]">
      <div className="grid gap-16 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-10 lg:col-span-4">
          <SectionMeta id="progression" />
          <SplitReveal id="progression-title" className="display-l" lines={["Your", "city."]} />
          <p className="max-w-[34ch] text-ash">
            Six districts on one line. Clear a district to open the next. The bonus call off the line tests the opposite
            instinct — {RIDDLES_TO_UNLOCK} solved riddles open it early.
          </p>
        </div>

        <div ref={root} className="lg:col-span-8">
          <CityMap />

          <div className="meta mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4 text-smoke">
            <span className="flex flex-wrap gap-x-6 gap-y-1">
              <span>
                Districts cleared <span className="tabular text-bone">{clearedCount} / {DISTRICTS.length}</span>
              </span>
              <span>
                {riddle.correct >= RIDDLES_TO_UNLOCK ? (
                  <>Bonus call unlocked by riddles</>
                ) : (
                  <>
                    Riddles solved <span className="tabular text-bone">{riddle.correct} / {RIDDLES_TO_UNLOCK}</span>
                  </>
                )}
              </span>
            </span>
            <button type="button" onClick={resetProgress} className="meta min-h-11 px-2 text-smoke hover:text-bone">
              Reset progress
            </button>
          </div>
        </div>
      </div>
    </Section>
  );
}
