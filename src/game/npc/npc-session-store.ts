import { createMockNpcSession } from "./mock-session";
import { createNpcSession } from "./useNpcVoice";
import type { NpcSessionFactory, NpcSessionStatus } from "./types";

/** The judge path is always deterministic; normal play still follows the env switch. */
export const npcSessionFactory: NpcSessionFactory = (npc) => {
  const isDemo = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("demo") === "1";
  // Vance's normal conversation has three turns. The judge path starts after
  // the routine authorisation refusal so its two prepared actions reach the
  // consequential freeze instead of stopping one response too early.
  if (isDemo) return createMockNpcSession(npc, 1.7, npc === "vance" ? 1 : 0);
  return process.env.NEXT_PUBLIC_NPC_VOICE_MODE === "live"
    ? createNpcSession(npc)
    : createMockNpcSession(npc);
};

let connectionStatus: NpcSessionStatus = "idle";
const statusListeners = new Set<(status: NpcSessionStatus) => void>();

export function publishNpcConnectionStatus(status: NpcSessionStatus) {
  connectionStatus = status;
  for (const listener of statusListeners) listener(status);
}

export function subscribeNpcConnectionStatus(listener: (status: NpcSessionStatus) => void) {
  statusListeners.add(listener);
  listener(connectionStatus);
  return () => {
    statusListeners.delete(listener);
  };
}
