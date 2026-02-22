// Rate limit minimale in-memory (per istanza).
// Non è “bulletproof” su serverless multi-instance, ma blocca spam banale subito.
// Poi, se serve, lo rendiamo più robusto.

type Bucket = { count: number; resetAtMs: number };

const buckets = new Map<string, Bucket>();

export function rateLimitOrThrow(opts: {
  key: string; // es. "run-token:1.2.3.4" oppure "score:1.2.3.4"
  limit: number; // es. 30
  windowMs: number; // es. 60_000
}) {
  const now = Date.now();
  const cur = buckets.get(opts.key);

  if (!cur || now >= cur.resetAtMs) {
    buckets.set(opts.key, { count: 1, resetAtMs: now + opts.windowMs });
    return;
  }

  cur.count += 1;

  if (cur.count > opts.limit) {
    const retryAfterSec = Math.ceil((cur.resetAtMs - now) / 1000);
    const err = new Error("rate_limited");
    // @ts-expect-error attach metadata
    err.statusCode = 429;
    // @ts-expect-error attach metadata
    err.retryAfterSec = retryAfterSec;
    throw err;
  }
}