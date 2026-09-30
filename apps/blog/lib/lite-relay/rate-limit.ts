/**
 * Minimal in-memory sliding-window rate limiter (per process). Good enough for the
 * PoC relay; a shared store (redis) is the follow-up for multi-instance deployments.
 */
type Window = number[];

const buckets = new Map<string, Window>();

export type RateLimit = { max: number; windowMs: number };

export const DEFAULT_LIMITS: Record<'ip' | 'client', RateLimit> = {
  ip: { max: 20, windowMs: 10 * 60_000 },
  client: { max: 5, windowMs: 10 * 60_000 }
};

/** Returns true if the key is within its limit (and records the hit). */
export function allow(key: string, limit: RateLimit, nowMs = Date.now()): boolean {
  const since = nowMs - limit.windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > since);
  if (hits.length >= limit.max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(nowMs);
  buckets.set(key, hits);
  if (buckets.size > 10_000) sweep(since);
  return true;
}

function sweep(since: number): void {
  for (const [key, hits] of buckets) {
    const live = hits.filter((t) => t > since);
    if (live.length === 0) buckets.delete(key);
    else buckets.set(key, live);
  }
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const first = forwarded?.split(',')[0]?.trim();
  return first && first.length > 0 ? first : request.headers.get('x-real-ip') ?? 'unknown';
}
