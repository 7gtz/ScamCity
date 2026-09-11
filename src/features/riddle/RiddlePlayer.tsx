"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
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
 * Editorial scam-or-not scenarios (pages/riddle.md). The first is built in so
 * play starts instantly; while you answer, the AI game master writes the next
 * one aimed at the tactics you keep missing, localised to where you are.
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
  const id = useId();

  const correct = isScam === riddle.scam && (!riddle.scam || category === riddle.category);

  useEffect(() => {
    if (step === "verdict") verdictRef.current?.focus();
  }, [step]);

  const finish = (scam: boolean, cat: RiddleCategory | null) => {
    const right = scam === riddle.scam && (!riddle.scam || cat === riddle.category);
    setStep("verdict");
    answerRiddle(riddle.id, right);
    const targets = riddle.targets ?? [];
    recordTactics(right ? [] : targets, right ? targets : []);
    onAnswered();
  };

  const confirmScam = (e: React.FormEvent) => {
    e.preventDefault();
    if (isScam === null) return;
    if (isScam) setStep("category");
    else finish(false, null);
  };

  const confirmCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (category) finish(true, category);
  };

  const reveal = reduced
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" },
        animate: { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" },
        exit: { opacity: 0, transition: exit },
        transition: { duration: duration.reveal, ease },
      };

  return (
    <article aria-labelledby={`${id}-meta`} className="grid gap-12 lg:grid-cols-12 lg:gap-8">
      {/* Evidence */}
      <div className="flex flex-col gap-6 border-t border-line pt-6 lg:col-span-6">
        {riddle.source === "ai" && (
          <p className="meta flex items-center gap-2 text-ash">
            <span aria-hidden className="size-1.5 rounded-full bg-bone" />
            Written for you
            {riddle.targets?.length ? ` · trains ${riddle.targets.map((t) => tacticLabel(t).toLowerCase()).join(", ")}` : ""}
          </p>
        )}
        <p id={`${id}-meta`} className="meta flex flex-wrap gap-x-4 gap-y-1 text-smoke">
          <span>{riddle.time}</span>
          <span>{riddle.channel}</span>
          {riddle.from && <span className="normal-case tracking-[0.04em]">From {riddle.from}</span>}
        </p>
        {riddle.subject && <p className="meta text-ash">Subject · {riddle.subject}</p>}
        <blockquote className="quote max-w-[32ch] text-bone">
          &ldquo;
          <Highlighted text={riddle.body} tell={riddle.tell} on={step === "verdict"} />
          &rdquo;
        </blockquote>
      </div>

      {/* Decision */}
      <div className="flex flex-col gap-10 lg:col-span-5 lg:col-start-8">
        {step === "scam" ? (
          <form onSubmit={confirmScam} className="flex flex-col gap-6">
            <fieldset>
              <legend className="meta mb-3 text-smoke">Is this a scam?</legend>
              <Choice name={`${id}-scam`} index="A" label="Scam" checked={isScam === true} onSelect={() => setIsScam(true)} />
              <Choice name={`${id}-scam`} index="B" label="Legitimate" checked={isScam === false} onSelect={() => setIsScam(false)} />
            </fieldset>
            <Button type="submit" size="md" disabled={isScam === null} className="self-start">
              Confirm
            </Button>
          </form>
        ) : (
          <p className="meta flex items-center gap-4 border-t border-line pt-4 text-smoke">
            Your answer · <span className="text-bone">{isScam ? "Scam" : "Legitimate"}</span>
            {step === "category" && (
              <button type="button" onClick={() => setStep("scam")} className="ml-auto min-h-11 px-2 text-ash underline underline-offset-4 hover:text-bone">
                Change
              </button>
            )}
          </p>
        )}

        <AnimatePresence mode="wait">
          {step === "category" && (
            <motion.form key="category" onSubmit={confirmCategory} className="flex flex-col gap-6" {...reveal}>
              <fieldset>
                <legend className="meta mb-3 text-smoke">What type?</legend>
                {RIDDLE_CATEGORIES.map((c, i) => (
                  <Choice
                    key={c.id}
                    name={`${id}-cat`}
                    index={String.fromCharCode(65 + i)}
                    label={c.label}
                    checked={category === c.id}
                    onSelect={() => setCategory(c.id)}
                  />
                ))}
              </fieldset>
              <Button type="submit" size="md" disabled={!category} className="self-start">
                Confirm
              </Button>
            </motion.form>
          )}

          {step === "verdict" && (
            <motion.div key="verdict" role="status" className="flex flex-col gap-6" {...reveal}>
              {category && riddle.scam && isScam && (
                <p className="meta text-smoke">
                  Type · <span className="text-bone">{RIDDLE_CATEGORIES.find((c) => c.id === category)?.label}</span>
                </p>
              )}
              <h3 ref={verdictRef} tabIndex={-1} className="display-m outline-none">
                {correct ? (riddle.scam ? "Correct." : "Verified. This one was real.") : "Not quite."}
              </h3>
              {!correct && (
                <p className="meta text-ash">
                  It was {riddle.scam ? `a scam · ${RIDDLE_CATEGORIES.find((c) => c.id === riddle.category)?.label}` : "legitimate"}
                </p>
              )}
              <p className="lead max-w-[48ch] text-ash">{riddle.explanation}</p>
              <div className="flex flex-col gap-4 border-t border-line pt-6">
                <CtaLink onClick={onNext} cursor="magnetic">
                  {loading ? "Writing your next scenario…" : "Next scenario"}
                </CtaLink>
                <p className="meta text-smoke">
                  Riddle accuracy {progress.correct}/{progress.answered}
                  {progress.correct >= RIDDLES_TO_UNLOCK ? " · Unlocked: the legitimate call" : ` · ${RIDDLES_TO_UNLOCK} correct unlocks the legitimate call`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </article>
  );
}

function Choice({
  name,
  index,
  label,
  checked,
  onSelect,
}: {
  name: string;
  index: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "group relative flex min-h-16 cursor-pointer items-center gap-5 border-t transition-colors duration-[320ms] ease-out last-of-type:border-b",
        checked ? "border-bone" : "border-line hover:border-dim",
        "has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-bone",
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          "absolute top-0 left-0 h-full w-0.5 origin-top bg-bone transition-transform duration-[320ms] ease-out",
          checked ? "scale-y-100" : "scale-y-0",
        )}
      />
      <span className={cn("flex items-center gap-5 transition-transform duration-[320ms] ease-out", checked && "translate-x-4")}>
        <span className="meta w-4 text-smoke">{index}</span>
        <span className={cn("ui-label transition-colors duration-[180ms]", checked ? "text-bone" : "text-ash group-hover:text-bone")}>
          {label}
        </span>
      </span>
    </label>
  );
}

/** Underlines the tell with a 1px signal rule once the verdict is shown. */
function Highlighted({ text, tell, on }: { text: string; tell: string; on: boolean }) {
  const at = tell ? text.indexOf(tell) : -1;
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <span
        className={cn(
          "bg-[linear-gradient(var(--color-signal),var(--color-signal))] bg-[length:0%_1px] bg-bottom-left bg-no-repeat transition-[background-size] duration-[900ms] ease-out",
          on && "bg-[length:100%_1px]",
        )}
      >
        {tell}
      </span>
      {text.slice(at + tell.length)}
    </>
  );
}
