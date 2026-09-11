"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { CtaLink } from "@/components/ui/CtaLink";
import { cn } from "@/lib/cn";
import type { EncounterTell } from "@/lib/validation/schemas";
import type { Grade } from "./grade";

type Props = {
  grade: Grade;
  scam: boolean;
  explanation: string;
  tells: EncounterTell[];
  freestyle: boolean;
  onNext: () => void;
  nextLabel: string;
  source?: "ai" | "static";
};

/** The verdict for an email, website or message: what it was, and what gave it away. */
export function Verdict({ grade, scam, explanation, tells, freestyle, onNext, nextLabel, source }: Props) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section role="status" aria-labelledby="verdict-title" className="grid gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-8">
      <div className="flex flex-col gap-5 lg:col-span-5">
        <p className="meta text-smoke">
          {scam ? "It was a scam" : "It was genuine"}
          {source === "ai" && " · written for you by the AI"}
        </p>
        <h2 id="verdict-title" ref={heading} tabIndex={-1} className={cn("display-m outline-none", grade.caught && "text-signal")}>
          {grade.headline}
        </h2>
        <p className="lead max-w-[46ch] text-ash">{explanation}</p>
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
          {tells.map((t, i) => (
            <li key={`${t.where}-${i}`} className="flex gap-4 border-t border-line py-4">
              <span className="meta w-20 shrink-0 text-smoke">{t.where}</span>
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
