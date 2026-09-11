import type { CallStatus } from "@/lib/live/types";

/**
 * Explicit call state machine (ScamCity-stack.md "State management").
 * `live` sub-states (provider-speaking / player-interrupting) are tracked by
 * the store's `speaking` field rather than as separate statuses.
 */
export const TRANSITIONS: Record<CallStatus, readonly CallStatus[]> = {
  idle: ["permission-requested", "connecting", "error"],
  "permission-requested": ["connecting", "idle", "error"],
  connecting: ["ringing", "idle", "error"],
  ringing: ["live", "ending", "error"],
  live: ["ending", "error"],
  ending: ["scoring", "error"],
  scoring: ["results", "error"],
  results: ["idle"],
  error: ["idle", "connecting"],
};

export const canTransition = (from: CallStatus, to: CallStatus) => from === to || TRANSITIONS[from].includes(to);

/** Returns the next status, or the current one if the move is illegal. */
export function transition(from: CallStatus, to: CallStatus): CallStatus {
  if (canTransition(from, to)) return to;
  if (process.env.NODE_ENV !== "production") console.warn(`[call] illegal transition ${from} → ${to}`);
  return from;
}
