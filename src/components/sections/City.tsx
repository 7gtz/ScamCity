"use client";

import { useRef, useState } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { DISTRICTS, type District } from "@/content/districts";
import { cn } from "@/lib/cn";
import { EASE, gsap, MQ, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { scrollToTarget } from "@/lib/motion/lenis";
import { Section, SectionMeta } from "./Section";

const HIDDEN = "inset(0% 0% 0% 100%)";
const SHOWN = "inset(0% 0% 0% 0%)";

/**
 * 03 — The districts. Pinned on desktop; each district wipes in horizontally
 * as you scroll (MASTER §7). Without pinning, rows switch the plate directly.
 */
export function City() {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  const last = DISTRICTS.length - 1;

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => {
        const plates = gsap.utils.toArray<HTMLElement>("[data-plate]", el);
        gsap.set(plates.slice(1), { clipPath: HIDDEN });
        setPinned(true);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: `+=${last * 70}%`,
            pin: true,
            scrub: 0.8,
            // Always settle on a whole district, never mid-wipe.
            // inertia: false — a fast flick must not project past the nearest district.
            snap: { snapTo: 1 / last, duration: { min: 0.3, max: 0.8 }, delay: 0.08, ease: EASE, inertia: false },
            onUpdate: (self) => setActive(Math.round(self.progress * last)),
          },
        });
        plates.slice(1).forEach((plate, i) => {
          tl.fromTo(plate, { clipPath: HIDDEN }, { clipPath: SHOWN, duration: 1 }, i);
          const inner = plate.querySelector("[data-plate-inner]");
          if (inner) tl.fromTo(inner, { xPercent: 12 }, { xPercent: 0, duration: 1 }, i);
        });
        trigger.current = tl.scrollTrigger ?? null;

        return () => {
          trigger.current = null;
          setPinned(false);
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const select = (i: number) => {
    const st = trigger.current;
    if (st) scrollToTarget(st.start + ((st.end - st.start) * i) / last + 1);
    else setActive(i);
  };

  return (
    <Section id="city">
      <div ref={root} className="gutter-x py-[var(--section)] lg:grid lg:h-dvh lg:grid-cols-12 lg:items-center lg:gap-8 lg:py-0">
        <div className="flex flex-col gap-10 lg:col-span-5">
          <SectionMeta id="city" />
          <SplitReveal
            id="city-title"
            className="display-m"
            lines={["Six districts.", <em key="e" className="font-light">Six ways in.</em>]}
          />

          {/* Desktop index */}
          <ol className="hidden lg:block">
            {DISTRICTS.map((d, i) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => select(i)}
                  aria-current={i === active ? "true" : undefined}
                  className="group flex w-full items-baseline gap-5 border-t border-line py-3 text-left"
                  data-cursor="magnetic"
                >
                  <span className={cn("meta w-7 transition-colors duration-[320ms]", i === active ? "text-bone" : "text-smoke")}>
                    {d.number}
                  </span>
                  <span
                    className={cn(
                      "font-display text-[clamp(1.25rem,2vw,1.75rem)] leading-none tracking-[-0.015em] uppercase transition-colors duration-[320ms] ease-out",
                      i === active ? "text-bone" : "text-smoke group-hover:text-ash",
                    )}
                  >
                    {d.title}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Desktop stage */}
        <div className="relative hidden h-[76dvh] lg:col-span-7 lg:block">
          {DISTRICTS.map((d, i) => (
            <Plate
              key={d.id}
              district={d}
              inert={i !== active}
              className={cn(!pinned && "transition-opacity duration-[900ms] ease-out", !pinned && i !== active && "opacity-0")}
            />
          ))}
        </div>

        {/* Mobile / tablet: a readable list, no pinning */}
        <ol className="mt-12 lg:hidden">
          {DISTRICTS.map((d) => (
            <li key={d.id} className="flex flex-col gap-3 border-t border-line py-6">
              <span className="meta text-smoke">District {d.number}</span>
              <span className="font-display text-[clamp(1.75rem,7vw,2.5rem)] leading-none tracking-[-0.02em] uppercase">
                {d.title}
              </span>
              <span className="max-w-[40ch] text-ash">{d.line}</span>
              {d.scenarioId && (
                <CtaLink href={`/play/${d.scenarioId}`} className="self-start">
                  Enter the district
                </CtaLink>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

function Plate({ district, inert, className }: { district: District; inert: boolean; className?: string }) {
  return (
    <div
      data-plate
      inert={inert}
      aria-hidden={inert || undefined}
      className={cn(
        "absolute inset-0 overflow-hidden bg-[radial-gradient(ellipse_at_28%_18%,var(--color-raised)_0%,var(--color-surface)_58%,var(--color-ink)_100%)]",
        className,
      )}
    >
      <div data-plate-inner className="absolute inset-0">
        <span
          aria-hidden
          className="absolute -right-[0.04em] -bottom-[0.2em] font-display text-[clamp(14rem,30vw,32rem)] leading-none font-light text-bone/[0.06] italic"
        >
          {district.number}
        </span>
        <div className="absolute inset-x-10 bottom-10 flex flex-col gap-5">
          <p className="meta text-smoke">District {district.number}</p>
          <p className="display-l">{district.title}</p>
          <p className="lead max-w-[36ch] text-ash">{district.line}</p>
          {district.scenarioId ? (
            <CtaLink href={`/play/${district.scenarioId}`} className="self-start">
              Enter the district
            </CtaLink>
          ) : (
            <p className="meta text-smoke">In development</p>
          )}
        </div>
      </div>
    </div>
  );
}
