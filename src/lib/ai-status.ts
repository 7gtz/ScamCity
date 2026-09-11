"use client";

import { useEffect, useState } from "react";

export interface AiStatus {
  gemini: boolean;
  models?: { live: string; director: string; analyst: string; judge: string; riddle: string };
}

let cached: Promise<AiStatus> | null = null;

/** Whether the server holds a Gemini key. Asked once per page load. */
export function getAiStatus(): Promise<AiStatus> {
  cached ??= fetch("/api/status", { cache: "no-store" })
    .then((r) => (r.ok ? (r.json() as Promise<AiStatus>) : { gemini: false }))
    .catch(() => ({ gemini: false }));
  return cached;
}

export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let alive = true;
    void getAiStatus().then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
}
