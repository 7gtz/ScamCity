"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CtaLink } from "@/components/ui/CtaLink";
import { RIDDLE_CATEGORIES, RIDDLES, type RiddleCategory, type RiddleScenario } from "@/content/riddles";
import { tacticLabel } from "@/content/tactics";
import { RIDDLES_TO_UNLOCK, useProgressStore, weakest } from "@/features/progress/progress-store";
import { useAiStatus } from "@/lib/ai-status";
import { cn } from "@/lib/cn";
import { getRealWorldContext } from "@/lib/live/real-world";
import { duration, ease, exit } from "@/lib/motion/tokens";

type Step = "scam" | "category" | "verdict";

/** Every third generated scenario is legitimate: the goal is verification, not paranoia. */
const LEGIT_EVERY = 3;

/**
 * Scam-or-not on a real-looking phone (pages/riddle.md). The first message is
 * built in so play starts instantly; while you answer, the AI game master
 * writes the next one aimed at the tactics you keep missing, localised to where
 * you are. Nothing is flagged until you commit: you inspect the message yourself.
 */
export function RiddlePlayer({ className }: { className?: string }) {
  const ai = useAiStatus();
  const [riddle, setRiddle] = useState<RiddleScenario>(RIDDLES[0]!);
  const [loading, setLoading] = useState(false);
  const staticIndex = useRef(0);
  const served = useRef<string[]>([RIDDLES[0]!.body]);
  const pending = useRef<Promise<RiddleScenario | null> | null>(null);
  const requested = useRef(0);

  const prefetch = useCallback(() => {
    if (!ai?.gemini || pending.current) return;
    requested.current += 1;
    const wantLegit = requested.current % LEGIT_EVERY === 0;
    pending.current = (async () => {
      try {
        const context = await getRealWorldContext(false);
        const res = await fetch("/api/riddle", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            weak: weakest(useProgressStore.getState().weak, 2),
            avoid: served.current.slice(-8),
            wantLegit,
            context,
          }),
          signal: AbortSignal.timeout(14_000),
        });
        return res.ok ? ((await res.json()) as RiddleScenario) : null;
      } catch {
        return null;
      }
    })();
  }, [ai]);

  const next = async () => {
    setLoading(true);
    const generated = pending.current ? await pending.current : null;
    pending.current = null;
    let upcoming = generated;
    if (!upcoming) {
      staticIndex.current = (staticIndex.current + 1) % RIDDLES.length;
      upcoming = RIDDLES[staticIndex.current]!;
    }
    served.current.push(upcoming.body);
    setRiddle(upcoming);
    setLoading(false);
  };

  return (
    <div className={className}>
      {/* Keyed so each scenario starts clean. */}
      <Riddle key={riddle.id} riddle={riddle} onAnswered={prefetch} onNext={next} loading={loading} />
    </div>
  );
}

function Riddle({
  riddle,
  onAnswered,
  onNext,
  loading,
}: {
  riddle: RiddleScenario;
  onAnswered: () => void;
  onNext: () => void;
  loading: boolean;
}) {
  const [step, setStep] = useState<Step>("scam");
  const [isScam, setIsScam] = useState<boolean | null>(null);
  const [category, setCategory] = useState<RiddleCategory | null>(null);
  const answerRiddle = useProgressStore((s) => s.answerRiddle);
  const recordTactics = useProgressStore((s) => s.recordTactics);
  const progress = useProgressStore((s) => s.riddle);
  const reduced = useReducedMotion();
  const verdictRef = useRef<HTMLHeadingElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();

  // On a phone the answer panel sits under the message: bring each new step into view.
  useEffect(() => {
    if (step !== "scam") panelRef.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  }, [step, reduced]);

  const correct = isScam === riddle.scam && (!riddle.scam || category === riddle.category);
  const categoryLabel = (c?: RiddleCategory | null) => RIDDLE_CATEGORIES.find((x) => x.id === c)?.label;

  useEffect(() => {
    if (step === "verdict") verdictRef.current?.focus();
  }, [step]);

  const finish = (scam: boolean, cat: RiddleCategory | null) => {
    const right = scam === riddle.scam && (!riddle.scam || cat === riddle.category);
    setIsScam(scam);
    setCategory(cat);
    setStep("verdict");
    answerRiddle(riddle.id, right);
    const targets = riddle.targets ?? [];
    recordTactics(right ? [] : targets, right ? targets : []);
    onAnswered();
  };

  const pick = (scam: boolean) => {
    if (!scam) return finish(false, null);
    setIsScam(true);
    setStep("category");
  };

  const reveal = reduced
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, transition: exit },
        transition: { duration: duration.ui * 1.4, ease },
      };

  const solved = progress.correct;

  return (
    <article aria-labelledby={`${id}-meta`} className="grid gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-6">
        <PhoneScreen riddle={riddle} labelId={`${id}-meta`} verdict={step === "verdict"} correct={correct} reduced={Boolean(reduced)} />
      </div>

      <div ref={panelRef} className="flex scroll-mt-24 flex-col gap-8 lg:col-span-5 lg:col-start-8 lg:pt-8">
        <AnimatePresence mode="wait">
          {step === "scam" && (
            <motion.div key="scam" className="flex flex-col gap-6" {...reveal}>
              <div className="flex flex-col gap-2">
                <p className="meta text-smoke">Step 1 · Is this a scam?</p>
                <p className="max-w-[40ch] text-ash">Inspect it first — who sent it, when, and what it asks you to do.</p>
              </div>
              <div role="group" aria-label="Your answer" className="grid grid-cols-2 gap-3">
                <AnswerTile label="Scam" hint="Report it" onClick={() => pick(true)} />
                <AnswerTile label="Legit" hint="It checks out" onClick={() => pick(false)} />
              </div>
            </motion.div>
          )}

          {step === "category" && (
            <motion.div key="category" className="flex flex-col gap-6" {...reveal}>
              <p className="meta flex items-center gap-4 border-t border-line pt-4 text-smoke">
                Your answer · <span className="text-bone">Scam</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsScam(null);
                    setStep("scam");
                  }}
                  className="ml-auto min-h-11 px-2 text-ash underline underline-offset-4 hover:text-bone"
                >
                  Change
                </button>
              </p>
              <div className="flex flex-col gap-2">
                <p className="meta text-bone">Step 2 of 2 · Identify the tactic</p>
                <p className="max-w-[40ch] text-ash">What kind of scam is it?</p>
              </div>
              <div role="group" aria-label="Scam type" className="grid grid-cols-2 gap-3">
                {RIDDLE_CATEGORIES.map((c) => (
                  <AnswerTile key={c.id} label={c.label} small onClick={() => finish(true, c.id)} />
                ))}
              </div>
            </motion.div>
          )}

          {step === "verdict" && (
            <motion.div key="verdict" role="status" className="flex flex-col gap-6" {...reveal}>
              <p className="meta text-smoke">
                Your answer ·{" "}
                <span className="text-bone">{isScam ? `Scam${category ? ` · ${categoryLabel(category)}` : ""}` : "Legit"}</span>
              </p>
              <h3 ref={verdictRef} tabIndex={-1} className={cn("display-m outline-none", correct ? "text-bone" : "text-signal")}>
                {correct ? (riddle.scam ? "Correct." : "Verified. This one was real.") : "Not quite."}
              </h3>
              {!correct && (
                <p className="meta text-ash">
                  It was {riddle.scam ? `a scam · ${categoryLabel(riddle.category)}` : "legitimate"}
                </p>
              )}
              <p className="lead max-w-[48ch] text-ash">{riddle.explanation}</p>
              {riddle.targets?.length ? (
                <p className="meta text-smoke">
                  {riddle.source === "ai" ? "Written for you · trains " : "Trains "}
                  {riddle.targets.map((t) => tacticLabel(t).toLowerCase()).join(", ")}
                </p>
              ) : null}
              <div className="flex flex-col gap-4 border-t border-line pt-6">
                <CtaLink onClick={onNext} cursor="magnetic">
                  {loading ? "Writing your next message…" : "Next message"}
                </CtaLink>
                <p className="meta text-smoke">
                  {solved >= RIDDLES_TO_UNLOCK ? (
                    <>Riddles solved <span className="tabular text-bone">{solved}</span> · Bonus call unlocked</>
                  ) : (
                    <>
                      Riddles solved <span className="tabular text-bone">{solved} / {RIDDLES_TO_UNLOCK}</span> · then the bonus call opens
                    </>
                  )}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

function AnswerTile({ label, hint, small, onClick }: { label: string; hint?: string; small?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-cursor="magnetic"
      className={cn(
        "group flex flex-col items-start justify-between gap-3 border border-line text-left transition-colors duration-[180ms] ease-out hover:border-bone hover:bg-raised",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bone",
        small ? "min-h-16 p-4" : "min-h-28 p-5",
      )}
    >
      <span
        className={cn(
          "max-w-full font-display leading-none tracking-[-0.015em] break-words uppercase",
          // "IMPERSONATION" must fit a half-width tile on a 390px phone.
          small ? "text-[1.0625rem] sm:text-xl" : "text-[clamp(1.75rem,3vw,2.5rem)]",
        )}
      >
        {label}
      </span>
      {hint && <span className="meta text-smoke transition-colors group-hover:text-ash">{hint}</span>}
    </button>
  );
}

const initialOf = (s: string) => s.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "#";
const WAVE = [5, 9, 14, 8, 17, 11, 6, 13, 19, 10, 7, 15, 12, 6, 9, 16, 8, 5, 11, 7];

/**
 * The evidence, as it would actually arrive: an SMS thread, an email, a
 * voicemail transcript on a phone screen. The screen is always light "paper",
 * so it reads as a real third-party app whatever the section around it.
 */
function PhoneScreen({
  riddle,
  labelId,
  verdict,
  correct,
  reduced,
}: {
  riddle: RiddleScenario;
  labelId: string;
  verdict: boolean;
  correct: boolean;
  reduced: boolean;
}) {
  const sender = riddle.from ?? (riddle.channel === "Call" ? "Unknown number" : "Unknown sender");
  const clock = riddle.time.replace(/\s?[AP]M$/i, "");
  const text = <Highlighted text={riddle.body} tell={riddle.tell} on={verdict} />;

  return (
    <motion.div
      animate={verdict && !correct && !reduced ? { x: [0, -10, 9, -6, 4, 0] } : { x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="mx-auto w-full max-w-[25rem] rounded-[2.25rem] bg-paper-ink p-2.5 lg:mx-0"
    >
      <p id={labelId} className="sr-only">
        {riddle.channel} from {sender} at {riddle.time}
      </p>
      <div data-tone="paper" className="tone-paper relative overflow-hidden rounded-[1.75rem] bg-paper text-paper-ink">
        <div aria-hidden className="flex items-center justify-between px-6 pt-3 pb-1 text-xs font-semibold tabular">
          <span>{clock}</span>
          <span className="flex items-end gap-[2px]">
            {[4, 6, 8, 10].map((h) => (
              <span key={h} className="w-[3px] bg-paper-ink" style={{ height: h }} />
            ))}
          </span>
        </div>

        {riddle.channel === "Email" ? (
          <EmailView riddle={riddle} sender={sender}>
            {text}
          </EmailView>
        ) : riddle.channel === "Call" ? (
          <div className="flex min-h-[21rem] flex-col">
            <div className="flex flex-col items-center gap-1 border-b border-paper-line px-5 pt-3 pb-4">
              <span className="text-[11px] tracking-[0.08em] text-paper-muted uppercase">Voicemail · {riddle.time}</span>
              <span className="text-lg font-semibold">{sender}</span>
              <span aria-hidden className="mt-2 flex h-5 items-center gap-[3px]">
                {WAVE.map((h, i) => (
                  <span key={i} className="w-[3px] bg-paper-muted" style={{ height: h }} />
                ))}
              </span>
            </div>
            <div className="px-5 py-5">
              <p className="mb-2 text-[11px] tracking-[0.08em] text-paper-muted uppercase">Transcript</p>
              <p className="text-[15px] leading-relaxed italic">“{text}”</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[21rem] flex-col">
            <div className="flex flex-col items-center gap-1 border-b border-paper-line px-5 pt-2 pb-3">
              <span aria-hidden className="grid size-11 place-items-center rounded-full bg-paper-2 text-base font-semibold text-paper-muted">
                {initialOf(sender)}
              </span>
              <span className="text-sm font-semibold">{sender}</span>
              <span className="text-[11px] text-paper-muted">Text message</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-4 py-4">
              <p className="text-center text-[11px] text-paper-muted">Today {riddle.time}</p>
              <p className="max-w-[88%] self-start rounded-[1.25rem] rounded-bl-[0.375rem] bg-paper-2 px-4 py-2.5 text-[15px] leading-snug">
                {text}
              </p>
            </div>
            <div aria-hidden className="mx-3 mb-3 rounded-full border border-paper-line px-4 py-2 text-sm text-paper-muted">
              Text message
            </div>
          </div>
        )}

        {verdict && (
          <span
            aria-hidden
            className={cn(
              "stamp pointer-events-none absolute top-[44%] left-1/2 -translate-x-1/2 border-[3px] bg-paper/80 px-4 py-1 font-display text-[2.5rem] leading-none uppercase",
              correct ? "border-safe text-safe" : "border-signal text-signal",
            )}
          >
            {riddle.scam ? "Scam" : "Real"}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function EmailView({ riddle, sender, children }: { riddle: RiddleScenario; sender: string; children: React.ReactNode }) {
  const match = /^(.*?)\s*<(.+)>$/.exec(sender);
  const name = match?.[1] || sender;
  const address = match?.[2];
  return (
    <div className="flex min-h-[21rem] flex-col">
      <div className="border-b border-paper-line px-5 pt-2 pb-3">
        <p className="text-[11px] text-paper-muted">Inbox</p>
        <p className="mt-1 text-lg leading-snug font-semibold">{riddle.subject ?? "(no subject)"}</p>
        <p className="mt-2 text-sm leading-snug break-all">
          <span className="font-semibold">{name}</span>
          {address && <span className="text-paper-muted"> &lt;{address}&gt;</span>}
        </p>
        <p className="text-[11px] text-paper-muted">to me · {riddle.time}</p>
      </div>
      <p className="px-5 py-5 text-[15px] leading-relaxed">{children}</p>
    </div>
  );
}

/** Underlines the tell with a 1px signal rule once the verdict is shown — never before. */
function Highlighted({ text, tell, on }: { text: string; tell: string; on: boolean }) {
  const at = tell ? text.indexOf(tell) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span
        className={cn(
          "bg-[linear-gradient(var(--color-signal),var(--color-signal))] bg-[length:0%_2px] bg-bottom-left bg-no-repeat transition-[background-size] duration-[900ms] ease-out",
          on && "bg-[length:100%_2px]",
        )}
      >
        {tell}
      </span>
      {text.slice(at + tell.length)}
    </>
  );
}
