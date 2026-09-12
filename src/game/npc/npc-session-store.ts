import { createMockNpcSession } from "./mock-session";
import { createNpcSession } from "./useNpcVoice";
import type { NpcSessionFactory, NpcSessionStatus } from "./types";

/** One switch keeps the scripted demo available without changing the overlay. */
export const npcSessionFactory: NpcSessionFactory =
  process.env.NEXT_PUBLIC_NPC_VOICE_MODE === "live"
    ? createNpcSession
    : createMockNpcSession;

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
