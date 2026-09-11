"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { CtaLink } from "@/components/ui/CtaLink";
import { costsLife, LIVES, useFreestyle } from "@/features/freestyle/freestyle-store";
import { lessonFrom } from "@/features/profile/defense";
import { LessonNote } from "@/features/profile/Profile";
import { cn } from "@/lib/cn";
import type { TacticId } from "@/lib/live/types";
import type { EncounterTell } from "@/lib/validation/schemas";
import type { Grade } from "./grade";

type Props = {
  grade: Grade;
  scam: boolean;
  /** The judge's read of what the player did — see `describeBehaviour`. */
  behaviour: string;
  explanation: string;
  tells: EncounterTell[];
  /** The tactics this encounter was built on. */
  targets: TacticId[];
  freestyle: boolean;
  onNext: () => void;
  nextLabel: string;
  source?: "ai" | "static";
};

/**
 * The verdict for an email, website or message: what you did, what it was,
 * at most three specific clues, and what the city learned from it.
 */
export function Verdict({ grade, scam, behaviour, explanation, tells, targets, freestyle, onNext, nextLabel, source }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const lesson = lessonFrom({
    missed: scam && !grade.correct ? targets : [],
    caught: scam && grade.correct ? targets : [],
    legit: !scam,
    rejectedGenuine: !scam && !grade.correct,
  });
  const tone = grade.caught ? "text-signal" : grade.correct ? "text-bone" : "text-amber";

  return (
    <section role="status" aria-labelledby="verdict-title" className="grid gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-8">
      <div className="flex flex-col gap-6 lg:col-span-5">
        <p className="meta text-smoke">
          {scam ? "It was a scam" : "It was genuine"}
          {source === "ai" && " · written for you by the AI"}
        </p>
        <div className="flex flex-col gap-4">
          <h2 id="verdict-title" ref={heading} tabIndex={-1} className={cn("display-m outline-none", tone)}>
            {grade.headline}
          </h2>
          <p className="text-xl leading-snug text-bone">{behaviour}</p>
          <p className="max-w-[46ch] text-ash">{explanation}</p>
        </div>
        {lesson && <LessonNote lesson={lesson} />}
        {freestyle && <FreestyleConsequence />}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2">
          {freestyle ? (
            <CtaLink href="/freestyle">Back to Freestyle</CtaLink>
          ) : (
            <CtaLink onClick={onNext} cursor="magnetic">
              {nextLabel}
            </CtaLink>
          )}
          <Button asChild variant="ghost" size="md">
            <Link href="/modes">All modes</Link>
          </Button>
        </div>
      </div>

      <div className="lg:col-span-6 lg:col-start-7">
        <h3 className="meta mb-4 text-smoke">{scam ? "What gave it away" : "Why it was genuine"}</h3>
        <ol>
          {tells.slice(0, 3).map((t, i) => (
            <li key={`${t.where}-${i}`} className="flex gap-4 border-t border-line py-4">
              <span className={cn("meta w-20 shrink-0", scam ? "text-signal" : "text-safe")}>{t.where}</span>
              <span className="flex flex-col gap-1">
                <span className="text-bone">&ldquo;{t.text}&rdquo;</span>
                <span className="text-sm leading-relaxed text-ash">{t.note}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** What this decision did to the day. The encounter was settled before the verdict rendered. */
function FreestyleConsequence() {
  const last = useFreestyle((s) => s.log[0]);
  const lives = useFreestyle((s) => s.lives);
  const status = useFreestyle((s) => s.status);
  if (!last) return null;
  const lost = costsLife(last);
  return (
    <p className={cn("meta", lost ? "text-signal" : "text-smoke")}>
      {lost ? "−1 life" : "No life lost"} · {Math.max(0, lives)} of {LIVES} left
      {status === "won" && " · You made it through the day"}
      {status === "lost" && " · Day over"}
    </p>
  );
}

/** Wraps every occurrence of the tells' quoted text, once the verdict is in. */
export function Highlight({ text, needles, on }: { text: string; needles: string[]; on: boolean }) {
  const usable = needles.filter((n) => n.trim().length >= 3 && text.includes(n));
  if (!on || !usable.length) return <>{text}</>;
  const pattern = new RegExp(`(${usable.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
  return (
    <>
      {text.split(pattern).map((part, i) =>
        usable.includes(part) ? (
          <mark key={i} className="bg-transparent text-inherit underline decoration-signal decoration-2 underline-offset-4">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
