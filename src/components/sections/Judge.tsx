import { SplitReveal } from "@/components/motion/SplitReveal";
import { ScoreReport } from "@/features/scoring/ScoreReport";
import type { CallScore } from "@/lib/live/types";
import { Section, SectionMeta } from "./Section";

/** An illustrative report — labelled as an example, never presented as a real player's result. */
const EXAMPLE: CallScore = {
  sessionId: "example",
  scenarioId: "bank-security",
  legitimate: false,
  outcome: "exposed",
  score: 72,
  threshold: 65,
  passed: true,
  caught: [
    { tactic: "authority", at: 18_000 },
    { tactic: "urgency", at: 102_000 },
    { tactic: "verification-request", at: 187_000 },
  ],
  missed: ["social-pressure"],
  events: [
    { at: 18_000, label: "questioned" },
    { at: 102_000, label: "pressure" },
    { at: 187_000, label: "challenged" },
    { at: 251_000, label: "ended" },
  ],
  suspicion: [
    { at: 0, value: 0 },
    { at: 18_000, value: 0.25 },
    { at: 60_000, value: 0.2 },
    { at: 102_000, value: 0.45 },
    { at: 150_000, value: 0.38 },
    { at: 187_000, value: 0.72 },
    { at: 251_000, value: 0.9 },
  ],
  durationMs: 251_000,
  notes: [
    "Your suspicion surfaced at 00:18 — when you asked the caller to prove who he was.",
    "You refused the security code. The story about other customers still moved you.",
  ],
};

/** 07 — Not win or lose: an evaluation of decisions (brief §15). */
export function Judge() {
  return (
    <Section id="judge" className="gutter-x py-[var(--section)]">
      <div className="mb-20 flex flex-col gap-10 md:mb-28">
        <SectionMeta id="judge" />
        <SplitReveal
          id="judge-title"
          className="display-l"
          lines={["Then the judge", <em key="e" className="font-light normal-case">reads the transcript.</em>]}
        />
        <p className="meta text-smoke">Example report</p>
      </div>
      <ScoreReport score={EXAMPLE} trigger="scroll" />
    </Section>
  );
}
