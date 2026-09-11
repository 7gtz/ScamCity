"use client";

import { useRef } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { cn } from "@/lib/cn";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { Section, SectionMeta } from "./Section";

const EXCHANGE = [
  { who: "Scammer", text: "Mr. Carter, I’m calling because we’ve detected suspicious activity on your account." },
  { who: "You", text: "What activity?" },
  { who: "Scammer", text: "I’ll need to verify your identity before I can disclose that." },
  { who: "You", text: "What’s your employee ID?" },
];

const RAIL = ["Player suspicion", "Tactic challenged", "Scammer pivots", "Increase pressure"];

/** 05 — Makes adaptation visible: a challenge, a pivot, a new tactic (brief §12). */
export function Opponent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 60%", once: true } })
          .fromTo("[data-turn]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.45 })
          .fromTo("[data-step]", { opacity: 0.3 }, { opacity: 1, duration: 0.5, stagger: 0.35 }, "-=0.2")
          .fromTo("[data-pivot]", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9 }, "-=0.1")
          .fromTo("[data-mark]", { backgroundSize: "0% 1px" }, { backgroundSize: "100% 1px", duration: 0.9 }, "+=0.2")
          .fromTo("[data-flag]", { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.6 }, "-=0.3");
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section id="opponent" className="gutter-x py-[var(--section)]">
      <div className="flex flex-col gap-10">
        <SectionMeta id="opponent" />
        <SplitReveal
          id="opponent-title"
          className="display-l"
          lines={["Not a script.", <em key="e" className="font-light normal-case">An adaptive agent.</em>]}
        />
      </div>

      <div ref={root} className="mt-20 grid gap-16 md:mt-28 lg:grid-cols-12 lg:gap-8">
        <ol aria-label="Example exchange" className="flex flex-col gap-8 lg:col-span-7">
          {EXCHANGE.map((turn, i) => (
            <li key={i} data-turn data-reveal className={cn("flex max-w-[36ch] flex-col gap-2", turn.who === "You" && "self-end text-right")}>
              <span className="meta text-smoke">{turn.who}</span>
              <span className={turn.who === "You" ? "text-xl text-bone" : "quote text-bone"}>
                {turn.who === "You" ? turn.text : `“${turn.text}”`}
              </span>
            </li>
          ))}
          <li data-pivot data-reveal className="mt-6 flex max-w-[38ch] flex-col gap-2 border-t border-line pt-8">
            <span className="meta text-smoke">Scammer · pivot</span>
            <span className="quote text-bone">
              &ldquo;I understand your concern. Unfortunately, if we don&rsquo;t resolve this within the next{" "}
              <span
                data-mark
                className="bg-[linear-gradient(var(--color-signal),var(--color-signal))] bg-[length:100%_1px] bg-bottom-left bg-no-repeat pb-0.5 not-italic uppercase tracking-[0.02em]"
              >
                ten minutes
              </span>
              , the account may be frozen.&rdquo;
            </span>
            <span data-flag data-reveal className="meta mt-4 flex items-center gap-3 text-signal">
              <span aria-hidden className="h-px w-6 bg-signal" /> Urgency detected
            </span>
          </li>
        </ol>

        <div className="lg:col-span-4 lg:col-start-9">
          <p className="meta mb-6 text-smoke">Agent state</p>
          <ol className="flex flex-col">
            {RAIL.map((step, i) => (
              <li key={step} data-step className="flex flex-col">
                <span className="ui-label border-t border-line py-4 text-bone">
                  <span className="meta mr-4 text-smoke">{String(i + 1).padStart(2, "0")}</span>
                  {step}
                </span>
                {i < RAIL.length - 1 && (
                  <span aria-hidden className="meta pb-4 pl-10 text-dim">
                    ↓
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-[34ch] text-ash">
            The caller reads your hesitation and changes tactic mid-sentence — the way a real one does.
          </p>
        </div>
      </div>
    </Section>
  );
}
