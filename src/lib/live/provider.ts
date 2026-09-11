import { GeminiLiveCallProvider } from "./gemini-provider";
import { MockLiveCallProvider } from "./mock-provider";
import type { LiveCallProvider, RealWorldContext } from "./types";

export type ProviderKind = "mock" | "gemini";

/** NEXT_PUBLIC_LIVE_PROVIDER=mock forces the scripted call even when a key exists. */
export const mockForced = () => process.env.NEXT_PUBLIC_LIVE_PROVIDER === "mock";

/**
 * The call room depends only on LiveCallProvider; this is the single place a
 * concrete provider is chosen.
 */
export function createLiveCallProvider(kind: ProviderKind, context?: RealWorldContext): LiveCallProvider {
  return kind === "gemini" ? new GeminiLiveCallProvider(context) : new MockLiveCallProvider();
}
