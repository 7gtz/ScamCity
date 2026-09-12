import type { GameEvent, GameEventBus, OnFn } from "./events";

type Listener = (event: GameEvent) => void;

/** Separate instances make tests and non-browser hosts independent. */
export function createEventBus(): GameEventBus {
  const listeners = new Map<GameEvent["type"], Set<Listener>>();
  const on: OnFn = (type, fn) => {
    const listener = fn as Listener;
    const group = listeners.get(type) ?? new Set<Listener>();
    group.add(listener);
    listeners.set(type, group);
    return () => { group.delete(listener); };
  };
  return {
    on,
    emit(event) {
      // Snapshot the listeners: subscriptions made during dispatch start next time.
      for (const listener of [...(listeners.get(event.type) ?? [])]) {
        try { listener(event); } catch { /* An observer cannot break gameplay. */ }
      }
    },
  };
}

export const { emit, on } = createEventBus();
