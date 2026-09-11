"use client";

import { useRef } from "react";
import { Counter } from "@/components/motion/Counter";
import { tacticLabel } from "@/content/tactics";
import { lessonFrom } from "@/features/profile/defense";
import { LessonNote } from "@/features/profile/Profile";
import { cn } from "@/lib/cn";
import type { CallScore } from "@/lib/live/types";
import { gsap, MQ, useGSAP } from "@/lib/motion/gsap";
import { fmt } from "./mock-judge";

type Props = {
  score: CallScore;
  trigger?: "load" | "scroll";
  /** Rendered after the notes (actions, links). */
  children?: React.ReactNode;
  className?: string;
};

/**
 * Forensic analysis of a call (pages/results.md). Plays once; any click or key
 * jumps to the final state. Reduced motion renders it final immediately.
 */
export function ScoreReport({ score, trigger = "load", children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({
          scrollTrigger: trigger === "scroll" ? { trigger: el, start: "top 70%", once: true } : undefined,
        });
        tl.fromTo("[data-seq]", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.22 })
          .fromTo("[data-draw]", { scaleX: 0 }, { scaleX: 1, duration: 0.9, transformOrigin: "left center" }, "-=0.6")
          .fromTo("[data-tick]", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1 }, "-=0.4")
          .fromTo(
            "[data-curve]",
            { clipPath: "inset(0% 100% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "none" },
            "-=0.5",
          )
          // The verdict lands as the counter finishes.
          .fromTo(
            "[data-stamp]",
            { scale: 1.8, opacity: 0, rotate: -10 },
            { scale: 1, opacity: 1, rotate: -3, duration: 0.5, ease: "back.out(2)" },
            1.5,
          );

        const skip = () => tl.progress(1);
        if (trigger === "load") {
          window.addEventListener("pointerdown", skip, { once: true });
          window.addEventListener("keydown", skip, { once: true });
        }
        return () => {
          window.removeEventListener("pointerdown", skip);
          window.removeEventListener("keydown", skip);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  // A genuine call is handled well only if the judge passed it — hanging up
  // without verifying is not "verified", whatever the outcome code says.
  const legitRejected = score.legitimate && !score.passed;
  const missed: { key: string; label: string; at?: number }[] = [
    ...score.missed.map((t) => ({ key: t, label: tacticLabel(t) })),
    ...(legitRejected
      ? [{ key: "legit", label: score.outcome === "rejected-legit" ? "Rejected a legitimate caller" : "Verify a genuine caller" }]
      : []),
  ];
  const lesson = lessonFrom({
    missed: score.missed,
    caught: score.caught.map((c) => c.tactic),
    legit: score.legitimate,
    rejectedGenuine: legitRejected,
  });
  const caught: { key: string; label: string; at?: number }[] = score.legitimate
    ? legitRejected
      ? []
      : [{ key: "verified", label: "Verified appropriately", at: score.durationMs }]
    : score.caught.map((c) => ({ key: c.tactic, label: tacticLabel(c.tactic), at: c.at }));

  // One dominant result: the number and a stamped verdict, then one sentence.
  const verdict = score.legitimate
    ? score.passed
      ? "Verified"
      : "Rejected"
    : score.outcome === "scammed"
      ? "Scammed"
      : score.passed
        ? "Passed"
        : "Not yet";
  const verdictTone = score.passed
    ? "border-safe text-safe"
    : score.outcome === "scammed" || score.outcome === "rejected-legit"
      ? "border-signal text-signal"
      : "border-amber text-amber";
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  // A text conversation is reported in its own words: never "call".
  const chat = score.channel === "sms";
  const summary = score.legitimate
    ? score.passed
      ? "It was real — and you verified it the right way."
      : "It was real. Verify before you hang up."
    : score.outcome === "scammed"
      ? `You caught ${plural(caught.length, "tactic")}, but the ${chat ? "contact" : "caller"} got what they came for.`
      : `You caught ${plural(caught.length, "tactic")}. You missed ${missed.length}.`;

  return (
    <div ref={ref} className={cn("flex flex-col gap-16 md:gap-24", className)}>
      <header className="flex flex-col gap-8">
        <div
          data-seq
          role="img"
          aria-label={`Score ${score.score} out of 100. ${verdict}. Pass mark ${score.threshold}.`}
          className="flex flex-wrap items-end gap-x-10 gap-y-6"
        >
          <span className="flex items-baseline gap-4">
            <span className="display-xl tabular">
              <Counter value={score.score} trigger={trigger} delay={0.3} />
            </span>
            <span aria-hidden className="display-m text-ash">
              / 100
            </span>
          </span>
          <span
            aria-hidden
            data-stamp
            className={cn(
              "mb-[0.4em] inline-block -rotate-3 border-2 px-4 py-2 font-display text-[clamp(2rem,4.4vw,4rem)] leading-none uppercase",
              verdictTone,
            )}
          >
            {verdict}
          </span>
        </div>
        <p data-seq className="font-display text-[clamp(1.5rem,2.8vw,2.5rem)] leading-tight tracking-[-0.01em]">
          {summary}
        </p>
        {lesson && (
          <div data-seq>
            <LessonNote lesson={lesson} />
          </div>
        )}
        <p data-seq className="meta text-smoke">
          Pass mark {score.threshold} · {chat ? "Conversation" : "Call"} {fmt(score.durationMs)}
          {score.judge === "gemini" && " · Judged by Gemini"}
          {score.judge === "rules" && " · Rules judge (offline)"}
        </p>
        {score.brief && (
          <p data-seq className="max-w-[60ch] text-ash">
            <span className="meta mr-3 text-smoke">{chat ? "This conversation" : "This call"}</span>
            {score.brief.caller} — {score.brief.hook}
          </p>
        )}
      </header>

      <div className="grid gap-12 md:grid-cols-2 md:gap-16">
        <Findings title="You caught" items={caught} empty="Nothing challenged." />
        <Findings title="You missed" items={missed} empty="Nothing slipped past you." offset={caught.length} signal />
      </div>

      <Timeline score={score} chat={chat} />

      <div data-seq className="flex max-w-[60ch] flex-col gap-3">
        <p className="meta text-smoke">Judge&rsquo;s notes</p>
        {score.notes.map((n) => (
          <p key={n} className="lead text-ash">
            {n}
          </p>
        ))}
      </div>

      {children && (
        <div data-seq className="flex flex-wrap items-center gap-x-8 gap-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Findings({
  title,
  items,
  empty,
  offset = 0,
  signal,
}: {
  title: string;
  items: { key: string; label: string; at?: number }[];
  empty: string;
  offset?: number;
  signal?: boolean;
}) {
  return (
    <section data-seq aria-label={title}>
      <h3 className={cn("meta mb-4", signal && items.length ? "text-signal" : "text-smoke")}>{title}</h3>
      {items.length ? (
        <ol>
          {items.map((item, i) => (
            <li key={item.key} className="flex items-baseline gap-4 border-t border-line py-4">
              <span className={cn("meta w-7 shrink-0", signal ? "text-signal" : "text-smoke")}>
                {String(offset + i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 font-display text-[clamp(1.25rem,2.2vw,1.875rem)] leading-tight tracking-[-0.015em] uppercase">
                {item.label}
              </span>
              {item.at !== undefined && <span className="meta tabular text-smoke">{fmt(item.at)}</span>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-line py-4 text-ash">{empty}</p>
      )}
    </section>
  );
}

function Timeline({ score, chat }: { score: CallScore; chat: boolean }) {
  const total = Math.max(score.durationMs, 1);
  const pct = (at: number) => Math.min(100, Math.max(0, (at / total) * 100));
  const points = score.suspicion.map((p) => `${pct(p.at).toFixed(2)},${(38 - p.value * 34).toFixed(2)}`).join(" ");

  return (
    <section data-seq aria-label="Timeline">
      <h3 className="meta mb-8 text-smoke">{chat ? "Message timeline" : "Call timeline"}</h3>

      {/* Desktop: horizontal */}
      <div aria-hidden className="hidden md:block">
        <div className="relative h-20">
          {score.events.map((e) => (
            <div
              key={`${e.label}-${e.at}`}
              data-tick
              className={cn(
                "absolute top-0 flex flex-col gap-2",
                // Edge ticks align inward so labels never leave the gutter.
                pct(e.at) > 88 ? "-translate-x-full items-end" : pct(e.at) < 12 ? "items-start" : "-translate-x-1/2 items-center",
              )}
              style={{ left: `${pct(e.at)}%` }}
            >
              <span className="meta tabular text-bone">{fmt(e.at)}</span>
              <span className="h-8 w-px bg-dim" />
              <span className="meta whitespace-nowrap text-ash">{e.label}</span>
            </div>
          ))}
        </div>
        <div className="relative mt-8">
          <span data-draw className="absolute inset-x-0 bottom-0 block h-px bg-line" />
          {/* Drawn by a clip wipe: dash tricks break under non-scaling strokes. */}
          <div data-curve>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-20 w-full overflow-visible">
              <polyline
                points={points}
                fill="none"
                stroke="var(--color-bone)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
          <span className="meta mt-3 block text-smoke">Suspicion</span>
        </div>
      </div>

      {/* Mobile: vertical, never horizontal scroll */}
      <ol aria-hidden className="border-l border-line md:hidden">
        {score.events.map((e) => (
          <li key={`${e.label}-${e.at}`} className="relative flex items-baseline gap-4 py-3 pl-5">
            <span className="absolute top-[1.15rem] left-0 h-px w-3 bg-dim" />
            <span className="meta tabular w-12 text-bone">{fmt(e.at)}</span>
            <span className="meta text-ash">{e.label}</span>
          </li>
        ))}
      </ol>

      <table className="sr-only">
        <caption>{chat ? "Message timeline" : "Call timeline"}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Event</th>
          </tr>
        </thead>
        <tbody>
          {score.events.map((e) => (
            <tr key={`${e.label}-${e.at}`}>
              <td>{fmt(e.at)}</td>
              <td>{e.label}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
