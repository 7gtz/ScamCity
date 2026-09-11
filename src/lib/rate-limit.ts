const hits = new Map<string, number[]>();

/**
 * Sliding-window limiter per client IP. In-memory is enough for a single demo
 * instance; the stack's Upstash limiter replaces this for multi-instance deploys.
 */
export function rateLimit(req: Request, bucket: string, limit: number, windowMs = 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export const tooMany = () => Response.json({ error: "Too many requests. Give it a minute." }, { status: 429 });
