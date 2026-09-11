"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { EASE, gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { Section, SectionMeta } from "./Section";

const WORDS = ["your attention.", "your trust.", "your urgency.", "your mistake."];

/** One masked line. `first` lines are hidden by CSS before paint (html.js). */
function Line({ children, first, attr }: { children: React.ReactNode; first?: boolean; attr?: "need" | "word" }) {
  return (
    <span className="split-mask block overflow-hidden">
      <span
        data-line
        data-reveal-line={first ? "" : undefined}
        data-need={attr === "need" ? "" : undefined}
        data-word={attr === "word" ? "" : undefined}
        className="block will-change-transform"
      >
        {children}
      </span>{" "}
    </span>
  );
}

/**
 * 04 — The strongest moment on the page: typography only (brief §11).
 * Desktop: pinned and scrubbed, each statement replacing the last in place.
 * Elsewhere: the same statements in reading order.
 */
export function Threat() {
  const stage = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = stage.current;
      if (!el) return;
      const layer = (n: number) => el.querySelectorAll(`[data-layer="${n}"] [data-line]`);
      const mm = gsap.matchMedia();

      mm.add({ pin: MQ.desktop, flow: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)" }, (ctx) => {
        const reveal = (targets: NodeListOf<Element>, trigger: Element | null) =>
          gsap.fromTo(
            targets,
            { yPercent: 150, y: 0 },
            { yPercent: 0, y: 0, duration: 1.1, stagger: 0.09, scrollTrigger: { trigger, start: "top 75%", once: true } },
          );

        reveal(layer(1), el.querySelector('[data-layer="1"]'));

        if (!ctx.conditions?.pin) {
          reveal(layer(2), el.querySelector('[data-layer="2"]'));
          reveal(layer(3), el.querySelector('[data-layer="3"]'));
          return;
        }

        el.dataset.pinned = "true";
        const need = el.querySelectorAll("[data-need]");
        const words = gsap.utils.toArray<Element>("[data-word]", el);
        const closing = layer(3);
        gsap.set([...need, ...words, ...closing], { yPercent: 150, y: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "none", duration: 1 },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: "+=340%",
            pin: true,
            scrub: 0.8,
            // Rest only on a complete statement, never between two.
            snap: { snapTo: "labels", duration: { min: 0.3, max: 0.9 }, delay: 0.08, ease: EASE, inertia: false },
          },
        });
        tl.addLabel("password")
          .to({}, { duration: 0.6 })
          .fromTo(layer(1), { yPercent: 0 }, { yPercent: -150, stagger: 0.1, immediateRender: false })
          .to(need, { yPercent: 0 }, "<0.3")
          .to(words[0]!, { yPercent: 0 }, "<")
          .addLabel("word-0");
        for (let i = 1; i < words.length; i++) {
          tl.to(words[i - 1]!, { yPercent: -150 }, "+=0.5")
            .to(words[i]!, { yPercent: 0 }, "<")
            .addLabel(`word-${i}`);
        }
        tl.to([...need, words.at(-1)!], { yPercent: -150 }, "+=0.5")
          .to(closing, { yPercent: 0, stagger: 0.12 }, "<0.3")
          .addLabel("decision")
          .to({}, { duration: 0.8 });

        return () => {
          delete el.dataset.pinned;
        };
      });
      return () => mm.revert();
    },
    { scope: stage },
  );

  const stacked = "group-data-[pinned=true]/stage:[grid-area:stack]";

  return (
    <Section id="threat">
      <div
        ref={stage}
        className={cn(
          "group/stage gutter-x relative flex min-h-dvh flex-col justify-center gap-24 py-[var(--section)] md:gap-32",
          "data-[pinned=true]:grid data-[pinned=true]:h-dvh data-[pinned=true]:content-center data-[pinned=true]:gap-0 data-[pinned=true]:py-0 data-[pinned=true]:[grid-template-areas:'stack']",
        )}
      >
        <SectionMeta
          id="threat"
          className="group-data-[pinned=true]/stage:absolute group-data-[pinned=true]/stage:top-[calc(var(--nav-h)+1.5rem)] group-data-[pinned=true]/stage:left-[var(--gutter)]"
        />

        <h2 id="threat-title" data-layer="1" className={cn("display-l", stacked)}>
          <Line first>They don&rsquo;t need</Line>
          <Line first>your password.</Line>
        </h2>

        <div data-layer="2" className={cn("flex flex-col gap-4", stacked)}>
          <p className="display-m text-ash">
            <Line attr="need">They need</Line>
          </p>
          <p
            className={cn(
              "display-l font-light normal-case italic",
              "group-data-[pinned=true]/stage:grid group-data-[pinned=true]/stage:[grid-template-areas:'word']",
            )}
          >
            {WORDS.map((w) => (
              <span key={w} className="block group-data-[pinned=true]/stage:[grid-area:word]">
                <Line attr="word">{w}</Line>
              </span>
            ))}
          </p>
        </div>

        <p data-layer="3" className={cn("display-l flex flex-col gap-[0.35em]", stacked)}>
          <span>
            <Line>The scammer</Line>
            <Line>doesn&rsquo;t attack</Line>
            <Line>your computer.</Line>
          </span>
          <span>
            <Line>They attack</Line>
            <Line>
              <span className="text-signal">your decision.</span>
            </Line>
          </span>
        </p>
      </div>
    </Section>
  );
}
