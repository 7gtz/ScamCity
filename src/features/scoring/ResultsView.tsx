"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { CtaLink } from "@/components/ui/CtaLink";
import { nextScenarioId } from "@/content/scenarios";
import { useFreestyle } from "@/features/freestyle/freestyle-store";
import { DefenseCard } from "@/features/profile/Profile";
import { useResultsStore } from "./results-store";
import { ScoreReport } from "./ScoreReport";

const subscribe = (onChange: () => void) => useResultsStore.persist.onFinishHydration(onChange);
const hasHydrated = () => useResultsStore.persist.hasHydrated();

/** The report reads as a printed forensic document: the paper tone. */
function Paper({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div data-tone="paper" className={`tone-paper min-h-dvh bg-ink text-bone ${className}`}>
      {children}
    </div>
  );
}

export function ResultsView({ sessionId }: { sessionId: string }) {
  const score = useResultsStore((s) => s.scores[sessionId]);
  const hydrated = useSyncExternalStore(subscribe, hasHydrated, () => false);
  const freestyle = useFreestyle((s) => s.status);

  if (!score) {
    if (!hydrated) return <Paper>{null}</Paper>;
    return (
      <Paper className="gutter-x flex flex-col justify-center gap-8">
        <h1 className="display-l">No record of this call.</h1>
        <p className="lead max-w-[48ch] text-ash">
          Scorecards live in this browser session only. Take another call to get a new report.
        </p>
        <CtaLink href="/modes">Choose a mode</CtaLink>
      </Paper>
    );
  }

  const chat = score.channel === "sms";
  const next = score.passed && !chat ? nextScenarioId(score.scenarioId) : undefined;

  return (
    <Paper>
      <div className="gutter-x mx-auto max-w-[1600px] pt-[calc(var(--nav-h)+4rem)] pb-32">
        <h1 className="sr-only">{chat ? "Conversation report" : "Call report"}</h1>
        <ScoreReport score={score}>
          {freestyle !== "idle" && <CtaLink href="/freestyle">Back to Freestyle</CtaLink>}
          {freestyle === "idle" && next && <CtaLink href={`/play/${next}`}>Next call</CtaLink>}
          {freestyle === "idle" && (
            <Button asChild variant="ghost" size="md">
              <Link href={chat ? "/messages" : `/play/${score.scenarioId}`}>{chat ? "New conversation" : "Replay this call"}</Link>
            </Button>
          )}
          <Button asChild variant="ghost" size="md">
            <Link href="/modes">All modes</Link>
          </Button>
        </ScoreReport>
        <DefenseCard className="mt-24 md:mt-32" />
      </div>
    </Paper>
  );
}
