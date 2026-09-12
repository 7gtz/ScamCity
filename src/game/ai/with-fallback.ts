/**
 * The implementation of the `withFallback` contract in `./adapter.ts`.
 *
 * Every AI call in the Detective Track goes through this. The point is that a
 * missing `GEMINI_API_KEY`, an outage, a moderation refusal and a slow answer
 * are all the *same event* at the call site: the authored fallback renders,
 * inside the deadline, and the game does not notice.
 *
 * Follows the pattern already set by `src/lib/gemini/server.ts` (abort-signal
 * deadlines, warn-and-degrade) and `src/content/fallback-*.ts` (authored copy
 * standing in for a model). Neither is modified.
 */

import type { AiAdapter, WithFallbackFn } from "@/game/ai/adapter";

/** Why the fallback was used. Logged, never shown to the player. */
export type FallbackReason = "timeout" | "error" | "no-key";

/**
 * True when the server has a key configured. Mirrors `hasGemini()` in
 * `src/lib/gemini/server.ts` without importing it, so this module stays
 * usable on the client, where `process.env.GEMINI_API_KEY` is never defined.
 *
 * On the client this is always false, which is correct: the browser must
 * reach the model through a route handler, never directly.
 */
const hasKey = () => Boolean(typeof process !== "undefined" && process.env?.GEMINI_API_KEY);

/**
 * Run an adapter, or its authored fallback — whichever can answer first.
 *
 * Guarantees, in order of importance:
 * 1. **Never throws.** A rejected `run()` resolves to `fallback(input)`.
 * 2. **Never exceeds `deadlineMs`.** A slow `run()` is abandoned, not awaited.
 * 3. **Always returns something renderable.**
 *
 * A late `run()` that settles after the deadline is ignored, and its rejection
 * is swallowed deliberately — without that, an abandoned promise surfaces as an
 * unhandled rejection and crashes the dev overlay.
 *
 * The one case that still throws is a `fallback` that itself throws: there is
 * then nothing renderable to return, and hiding that would turn an authoring
 * bug into a blank panel. Fallbacks must be pure, total and synchronous.
 */
export const withFallback: WithFallbackFn = async <TIn, TOut>(
  a: AiAdapter<TIn, TOut>,
  input: TIn,
): Promise<TOut> => {
  const authored = (reason: FallbackReason): TOut => {
    if (reason !== "no-key") console.warn(`[detective-ai] fallback (${reason}) after ${a.deadlineMs}ms`);
    return a.fallback(input);
  };

  if (!hasKey()) return authored("no-key");

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<{ ok: false; reason: FallbackReason }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, reason: "timeout" }), a.deadlineMs);
  });

  try {
    const live = Promise.resolve()
      .then(() => a.run(input))
      .then((value) => ({ ok: true as const, value }))
      .catch(() => ({ ok: false as const, reason: "error" as const }));

    const settled = await Promise.race([live, deadline]);
    return settled.ok ? settled.value : authored(settled.reason);
  } catch {
    // `a.run` threw synchronously, before returning a promise.
    return authored("error");
  } finally {
    clearTimeout(timer);
  }
};
