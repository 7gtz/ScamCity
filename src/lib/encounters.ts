"use client";

import { FALLBACK_EMAILS, FALLBACK_SITES } from "@/content/fallback-encounters";
import { useFreestyle } from "@/features/freestyle/freestyle-store";
import { useProgressStore, weakest } from "@/features/progress/progress-store";
import { getRealWorldContext } from "@/lib/live/real-world";
import type { ChatPlan, ChatTurn, GeneratedEmail, GeneratedSite } from "@/lib/validation/schemas";

export type Source = { id: string; source: "ai" | "static" };
export type EmailEncounter = GeneratedEmail & Source;
export type SiteEncounter = GeneratedSite & Source;

export interface EncounterOptions {
  difficulty?: 1 | 2 | 3;
  wantLegit?: boolean;
  avoid?: string[];
}

async function request(options: EncounterOptions) {
  const { weak, cleared } = useProgressStore.getState();
  return {
    difficulty: options.difficulty ?? (Math.min(3, 1 + Math.floor(cleared.length / 2)) as 1 | 2 | 3),
    wantLegit: options.wantLegit ?? Math.random() < 0.3,
    // One player model across every channel: what you miss anywhere is aimed at everywhere.
    weak: weakest(weak, 3),
    avoid: (options.avoid ?? []).slice(-8),
    // Freestyle keeps the session's (possibly GPS + weather) context; otherwise device time and timezone.
    context: useFreestyle.getState().context ?? (await getRealWorldContext(false)),
  };
}

async function post<T>(path: string, body: unknown, timeoutMs: number): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const pickFallback = <T>(pool: T[], wantLegit: boolean, isScam: (t: T) => boolean) => {
  const matching = pool.filter((t) => isScam(t) === !wantLegit);
  const list = matching.length ? matching : pool;
  return list[Math.floor(Math.random() * list.length)]!;
};

/** A fresh AI email aimed at this player; a built-in one if the AI is unavailable. */
export async function fetchEmail(options: EncounterOptions = {}): Promise<EmailEncounter> {
  const body = await request(options);
  const email = await post<EmailEncounter>("/api/email", body, 20_000);
  if (email) return email;
  const fallback = pickFallback(FALLBACK_EMAILS, body.wantLegit, (e) => e.scam);
  return { ...fallback, id: `static-${FALLBACK_EMAILS.indexOf(fallback)}-${Date.now()}`, source: "static" };
}

export async function fetchSite(options: EncounterOptions = {}): Promise<SiteEncounter> {
  const body = await request(options);
  const site = await post<SiteEncounter>("/api/site", body, 20_000);
  if (site) return site;
  const fallback = pickFallback(FALLBACK_SITES, body.wantLegit, (s) => s.scam);
  return { ...fallback, id: `static-${FALLBACK_SITES.indexOf(fallback)}-${Date.now()}`, source: "static" };
}

/** Messages needs the live AI; returns null when it isn't available. */
export async function startChat(options: EncounterOptions = {}) {
  const body = await request(options);
  const res = await post<{ plan: ChatPlan }>("/api/chat", { action: "start", ...body }, 16_000);
  return res ? { plan: res.plan, difficulty: body.difficulty } : null;
}

export function chatTurn(plan: ChatPlan, difficulty: number, history: { speaker: "player" | "scammer"; text: string }[]) {
  return post<ChatTurn>("/api/chat", { action: "turn", plan, difficulty, history: history.slice(-40) }, 14_000);
}
