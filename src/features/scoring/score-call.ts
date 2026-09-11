import type { CallScore, CompletedCall } from "@/lib/live/types";
import { judgeCall } from "./mock-judge";

/**
 * The Gemini judge reads the transcript; if it is unavailable, slow or wrong,
 * the deterministic rules judge scores the call instead. Always resolves.
 */
export async function scoreCall(call: CompletedCall): Promise<CallScore> {
  try {
    const res = await fetch("/api/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(call),
      signal: AbortSignal.timeout(18_000),
    });
    if (res.ok) return (await res.json()) as CallScore;
  } catch {
    // fall through to the rules judge
  }
  return judgeCall(call);
}
