import type { LiveCallEvent, LiveCallEventType, LiveCallListener } from "./types";

/** Typed event plumbing shared by every LiveCallProvider. */
export class LiveCallEmitter {
  private listeners = new Map<LiveCallEventType, Set<(e: LiveCallEvent) => void>>();

  on<T extends LiveCallEventType>(type: T, listener: LiveCallListener<T>) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as (e: LiveCallEvent) => void);
    this.listeners.set(type, set);
    return () => set.delete(listener as (e: LiveCallEvent) => void);
  }

  protected emit(event: LiveCallEvent) {
    this.listeners.get(event.type)?.forEach((listener) => listener(event));
  }

  protected clearListeners() {
    this.listeners.clear();
  }
}
