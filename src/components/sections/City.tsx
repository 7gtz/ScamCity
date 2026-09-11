"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { CtaLink } from "@/components/ui/CtaLink";
import { DISTRICTS, type District } from "@/content/districts";
import { CityMap, type MapKey } from "@/features/districts/CityMap";
import { CityMapDialog } from "@/features/districts/CityMapDialog";
import { DistrictArtifact } from "@/features/districts/DistrictArtifact";
import { cn } from "@/lib/cn";
import { EASE, gsap, MQ, ScrollTrigger, useGSAP } from "@/lib/motion/gsap";
import { scrollToTarget } from "@/lib/motion/lenis";
import { Section, SectionMeta } from "./Section";

const HIDDEN = "inset(0% 0% 0% 100%)";
const SHOWN = "inset(0% 0% 0% 0%)";

const LG = "(min-width: 1024px)";
const subscribeLg = (cb: () => void) => {
  const mq = window.matchMedia(LG);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const useLg = () =>
  useSyncExternalStore(
    subscribeLg,
    () => window.matchMedia(LG).matches,
    () => false,
  );

/**
 * The districts. Pinned on desktop: each district wipes in horizontally as you
 * scroll (MASTER §7). Below lg the same plates stack as a list — one set of
 * DOM, never a duplicated mobile copy.
 */
export function City() {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);
  /** The place the map overlay points at; null while it's closed. */
  const [mapFor, setMapFor] = useState<MapKey | null>(null);
  const lg = useLg();
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
                  <span
                    aria-hidden
                    className={cn("ml-auto h-px w-8 self-center transition-opacity duration-[320ms]", i === active ? "opacity-100" : "opacity-0")}
                    style={{ background: d.hueText }}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* One set of plates: stacked and wiped on desktop, a list below lg. */}
        <div className="mt-12 flex flex-col gap-4 lg:relative lg:col-span-7 lg:mt-0 lg:block lg:h-[76dvh]">
          {DISTRICTS.map((d, i) => (
            <Plate
              key={d.id}
              district={d}
              onMap={() => setMapFor(d.id)}
              inert={lg && i !== active}
              className={cn(
                !pinned && "lg:transition-opacity lg:duration-[900ms] lg:ease-out",
                !pinned && i !== active && "lg:opacity-0",
              )}
            />
          ))}
        </div>
      </div>
      <CityMapDialog focus={mapFor} onClose={() => setMapFor(null)} />
    </Section>
  );
}

function Plate({
  district: d,
  inert,
  onMap,
  className,
}: {
  district: District;
  inert: boolean;
  /** Opens the city map overlay, pointing at this district. */
  onMap: () => void;
  className?: string;
}) {
  return (
    <article
      data-plate
      inert={inert}
      aria-hidden={inert || undefined}
      aria-label={`District ${d.number}, ${d.title}`}
      style={{ "--hue": d.hue, "--hue-text": d.hueText } as React.CSSProperties}
      className={cn(
        "relative flex min-h-[36rem] flex-col overflow-hidden lg:absolute lg:inset-0 lg:min-h-0",
        // Each district under its own street light.
        "bg-[radial-gradient(ellipse_at_78%_14%,color-mix(in_srgb,var(--hue)_34%,var(--color-raised))_0%,var(--color-surface)_52%,var(--color-ink)_100%)]",
        className,
      )}
    >
      <div data-plate-inner className="relative flex flex-1 flex-col lg:absolute lg:inset-0">
        {/* Halftone light, like a newsprint photo of the district at night. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(circle,var(--hue-text)_1px,transparent_1.7px)] [background-size:9px_9px] [mask-image:radial-gradient(ellipse_at_82%_88%,black_0%,transparent_62%)]"
        />
        <span
          aria-hidden
          className="absolute -right-[0.04em] -bottom-[0.2em] font-display text-[clamp(12rem,30vw,32rem)] leading-none font-light text-bone/[0.06] italic"
        >
          {d.number}
        </span>

        <div className="relative flex flex-1 flex-col justify-between gap-10 p-6 lg:p-10">
          <div className="flex items-start justify-between gap-6">
            {/* Where this district sits in the city: a live thumbnail of the same map, opening it full-screen. */}
            <button
              type="button"
              onClick={onMap}
              data-cursor="view"
              aria-label={`Show District ${d.number}, ${d.title}, on the city map`}
              className="group hidden w-[min(16rem,38%)] flex-col gap-2 text-left lg:flex"
            >
              <CityMap
                variant="compact"
                focus={d.id}
                className="w-full border border-line bg-ink/60 transition-colors duration-[320ms] group-hover:border-dim"
              />
              <span className="meta flex items-center gap-2 text-smoke transition-colors duration-[320ms] group-hover:text-bone">
                On the city map <span aria-hidden>→</span>
              </span>
            </button>
            <DistrictArtifact artifact={d.artifact} className="ml-auto w-full sm:w-[21rem] lg:w-[min(22rem,48%)]" />
          </div>
          <div className="flex flex-col gap-4 lg:gap-5">
            <p className="meta text-[color:var(--hue-text)]">
              District {d.number} · Runs on {d.lever.toLowerCase()}
            </p>
            <p className="font-display text-[clamp(2.25rem,9vw,4rem)] leading-[0.9] font-[380] tracking-[-0.03em] uppercase lg:text-[clamp(3rem,6vw,6.5rem)]">
              {d.title}
            </p>
            <p className="lead max-w-[36ch] text-ash">{d.line}</p>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {d.scenarioId && <CtaLink href={`/play/${d.scenarioId}`}>Enter the district</CtaLink>}
              <button type="button" onClick={onMap} className="meta min-h-11 text-smoke transition-colors hover:text-bone lg:hidden">
                On the city map →
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
