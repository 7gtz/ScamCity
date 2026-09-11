import { useFreestyle } from "@/features/freestyle/freestyle-store";
import type { Channel } from "@/features/freestyle/schedule";
import { useProgressStore } from "@/features/progress/progress-store";
import type { TacticId } from "@/lib/live/types";

/**
 * Every decision feeds the same player model. Tactics missed in an email are
 * the tactics the next call, chat or website will lean on (and vice versa).
 */
export function recordEncounter(r: {
  channel: Channel;
  scam: boolean;
  correct: boolean;
  caught: boolean;
  targets: TacticId[];
  title: string;
}) {
  const progress = useProgressStore.getState();
  progress.learn(r.targets);
  progress.recordTactics(r.correct ? [] : r.targets, r.correct ? r.targets : []);

  const freestyle = useFreestyle.getState();
  if (freestyle.current?.spec.channel === r.channel) {
    freestyle.resolve({ correct: r.correct, caught: r.caught, title: r.title, legit: !r.scam, targets: r.targets });
  }
}
