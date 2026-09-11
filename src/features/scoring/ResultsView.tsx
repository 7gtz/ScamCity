"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { CtaLink } from "@/components/ui/CtaLink";
import { nextScenarioId } from "@/content/scenarios";
import { useResultsStore } from "./results-store";
import { ScoreReport } from "./ScoreReport";

const subscribe = (onChange: () => void) => useResultsStore.persist.onFinishHydration(onChange);
const hasHydrated = () => useResultsStore.persist.hasHydrated();

export function ResultsView({ sessionId }: { sessionId: string }) {
  const score = useResultsStore((s) => s.scores[sessionId]);
  const hydrated = useSyncExternalStore(subscribe, hasHydrated, () => false);

  if (!score) {
    if (!hydrated) return <div className="min-h-dvh" />;
    return (
      <div className="gutter-x flex min-h-dvh flex-col justify-center gap-8">
        <h1 className="display-l">No record of this call.</h1>
        <p className="lead max-w-[48ch] text-ash">
          Scorecards live in this browser session only. Take another call to get a new report.
        </p>
        <CtaLink href="/play">Take a call</CtaLink>
      </div>
    );
  }

  const next = score.passed ? nextScenarioId(score.scenarioId) : undefined;

  return (
    <div className="gutter-x mx-auto max-w-[1600px] pt-[calc(var(--nav-h)+4rem)] pb-32">
      <h1 className="sr-only">Call report</h1>
      <ScoreReport score={score}>
        {next && <CtaLink href={`/play/${next}`}>Next call</CtaLink>}
        <Button asChild variant="ghost" size="md">
          <Link href={`/play/${score.scenarioId}`}>Replay this call</Link>
        </Button>
        <Button asChild variant="ghost" size="md">
          <Link href="/#progression">Back to the city</Link>
        </Button>
      </ScoreReport>
    </div>
  );
}
