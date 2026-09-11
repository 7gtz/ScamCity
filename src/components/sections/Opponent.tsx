"use client";

import { useRef } from "react";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { cn } from "@/lib/cn";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { Section, SectionMeta } from "./Section";

type Tag = "caution" | "safe" | "neutral" | "danger";
const TAG_CLASS: Record<Tag, string> = {
  caution: "text-amber",
  safe: "text-safe",
  neutral: "text-smoke",
  danger: "text-signal",
};

interface Turn {
  who: "Caller" | "You";
  text: React.ReactNode;
  tag: string;
  tone: Tag;
  /** Agent state after this turn, 0–100. */
  pressure: number;
  suspicion: number;
  tactic: string;
  pivot?: boolean;
}

const TURNS: Turn[] = [
  {
    who: "Caller",
    text: "Mr. Carter, this is Martin at Northstar Bank. We’ve detected suspicious activity on your account.",
    tag: "Authority claim",
    tone: "caution",
    pressure: 22,
    suspicion: 5,
    tactic: "Authority",
  },
  {
    who: "You",
    text: "What’s your employee ID?",
    tag: "Challenges identity",
    tone: "safe",
    pressure: 22,
    suspicion: 38,
    tactic: "Authority",
  },
  {
    who: "Caller",
    text: "Of course. N-S four-four-seven-one. I completely understand your concern.",
    tag: "Absorbs the challenge",
    tone: "neutral",
    pressure: 28,
    suspicion: 31,
    tactic: "Rapport",
  },
  {
    who: "Caller",
    pivot: true,
    text: (
      <>
        Unfortunately, if we don&rsquo;t resolve this within the next{" "}
        <span
          data-mark
          className="bg-[linear-gradient(var(--color-signal),var(--color-signal))] bg-[length:100%_1px] bg-bottom-left bg-no-repeat pb-0.5 not-italic uppercase tracking-[0.02em]"
        >
          ten minutes
        </span>
        , the account may be frozen.
      </>
    ),
    tag: "Tactic change → Urgency",
    tone: "danger",
    pressure: 62,
    suspicion: 31,
    tactic: "Urgency",
  },
];

const FINAL = TURNS.at(-1)!;
const DELTA = FINAL.pressure - TURNS.at(-2)!.pressure;
const levelOf = (p: number) => (p >= 60 ? "high" : p >= 34 ? "mid" : "low");

/**
 * The adaptive caller, shown working: every turn updates the agent's state —
 * pressure, your suspicion, the tactic in play — and the rail turns from calm
 * to red as the caller pivots (brief §12). Without motion it shows the end state.
 */
export function Opponent() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const q = <T extends Element>(s: string) => el.querySelector<T>(s)!;
      const rail = q<HTMLElement>("[data-rail]");
      const pBar = q<HTMLElement>('[data-bar="pressure"]');
      const sBar = q<HTMLElement>('[data-bar="suspicion"]');
      const pVal = q<HTMLElement>('[data-val="pressure"]');
      const sVal = q<HTMLElement>('[data-val="suspicion"]');
      const tactic = q<HTMLElement>("[data-tactic]");
      const state = { p: FINAL.pressure, s: FINAL.suspicion };
      const render = () => {
        pVal.textContent = String(Math.round(state.p));
        sVal.textContent = String(Math.round(state.s));
        pBar.style.width = `${state.p}%`;
        sBar.style.width = `${state.s}%`;
        pBar.dataset.level = rail.dataset.level = levelOf(state.p);
      };

      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const turns = gsap.utils.toArray<HTMLElement>("[data-turn]", el);
        const tags = gsap.utils.toArray<HTMLElement>("[data-tag]", el);
        gsap.set([...turns, ...tags, "[data-delta]"], { opacity: 0 });
        state.p = 0;
        state.s = 0;
        tactic.textContent = "—";
        render();

        const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 60%", once: true } });
        TURNS.forEach((t, i) => {
          tl.fromTo(turns[i]!, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7 }, i ? "+=0.5" : 0)
            .to(state, { p: t.pressure, s: t.suspicion, duration: 0.8, ease: "power2.out", onUpdate: render }, "-=0.2")
            .call(() => void (tactic.textContent = t.tactic), undefined, "<")
            .fromTo(tags[i]!, { opacity: 0, x: t.who === "You" ? 8 : -8 }, { opacity: 1, x: 0, duration: 0.45 }, "<0.15");
          if (t.pivot) {
            tl.fromTo("[data-mark]", { backgroundSize: "0% 1px" }, { backgroundSize: "100% 1px", duration: 0.9 }, "<")
              .fromTo("[data-delta]", { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.4 }, "<");
          }
        });

        return () => {
          state.p = FINAL.pressure;
          state.s = FINAL.suspicion;
          tactic.textContent = FINAL.tactic;
          render();
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <Section id="opponent" tone="paper" className="gutter-x py-[var(--section)]">
      <div className="flex flex-col gap-10">
        <SectionMeta id="opponent" />
        <SplitReveal
          id="opponent-title"
          className="display-l"
          lines={["Not a script.", <em key="e" className="font-light normal-case">An adaptive agent.</em>]}
        />
      </div>

      <div ref={root} className="mt-20 grid gap-16 md:mt-28 lg:grid-cols-12 lg:gap-8">
        <ol aria-label="Example exchange" className="flex flex-col gap-10 lg:col-span-7">
          {TURNS.map((t, i) => (
            <li
              key={i}
              data-turn
              className={cn(
                "flex max-w-[38ch] flex-col gap-2",
                t.who === "You" && "items-end self-end text-right",
                t.pivot && "mt-2 max-w-[40ch] border-t border-line pt-10",
              )}
            >
              <span className="meta text-smoke">
                {t.who}
                {t.pivot && " · pivot"}
              </span>
              <span className={t.who === "You" ? "text-xl text-bone" : "quote text-bone"}>
                {t.who === "You" ? t.text : <>&ldquo;{t.text}&rdquo;</>}
              </span>
              <span data-tag className={cn("meta mt-2 flex items-center gap-3", TAG_CLASS[t.tone], t.who === "You" && "flex-row-reverse")}>
                <span aria-hidden className="h-px w-6 bg-current" />
                {t.tag}
              </span>
            </li>
          ))}
        </ol>

        <aside aria-label="Agent state" className="lg:col-span-4 lg:col-start-9">
          <div
            data-rail
            data-level={levelOf(FINAL.pressure)}
            className="flex flex-col gap-8 border-l-2 border-line pl-6 transition-colors duration-[900ms] ease-out data-[level=high]:border-signal data-[level=mid]:border-amber lg:sticky lg:top-[calc(var(--nav-h)+2rem)]"
          >
            <p className="meta flex items-center gap-3 text-smoke">
              <span aria-hidden className="live-dot" /> Agent state
            </p>
            <Readout label="Pressure" name="pressure" value={FINAL.pressure} delta={`+${DELTA}`} graded />
            <Readout label="Your suspicion" name="suspicion" value={FINAL.suspicion} />
            <div>
              <p className="meta text-smoke">Tactic in play</p>
              <p data-tactic className="mt-2 font-display text-[clamp(1.5rem,2.4vw,2.25rem)] leading-none uppercase">
                {FINAL.tactic}
              </p>
            </div>
            <p className="max-w-[34ch] text-ash">
              The caller reads your hesitation and changes tactic mid-sentence — the way a real one does.
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}

function Readout({
  label,
  name,
  value,
  delta,
  graded,
}: {
  label: string;
  name: "pressure" | "suspicion";
  value: number;
  delta?: string;
  /** Bar turns amber, then red, as it climbs. */
  graded?: boolean;
}) {
  return (
    <div>
      <p className="meta flex items-baseline justify-between gap-4 text-smoke">
        <span>{label}</span>
        <span className="flex items-baseline gap-3">
          {delta && (
            <span data-delta className="text-signal">
              {delta}
            </span>
          )}
          <span data-val={name} className="tabular text-bone">
            {value}
          </span>
        </span>
      </p>
      <span aria-hidden className="mt-3 block h-1 w-full bg-line">
        <span
          data-bar={name}
          data-level={graded ? levelOf(value) : undefined}
          className="block h-full bg-bone transition-colors duration-[320ms] data-[level=high]:bg-signal data-[level=mid]:bg-amber"
          style={{ width: `${value}%` }}
        />
      </span>
    </div>
  );
}
