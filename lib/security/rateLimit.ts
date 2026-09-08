import { getClientIp } from "@/lib/http/requestMeta";

type BucketKey = string;

const buckets = new Map<BucketKey, { count: number; resetAt: number }>();
const MAX_BUCKETS = 10_000;
let lastCleanupAt = 0;

function cleanupBuckets(now: number) {
  if (buckets.size < MAX_BUCKETS && now - lastCleanupAt < 60_000) return;

  lastCleanupAt = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value as BucketKey | undefined;
    if (!oldestKey) break;
    buckets.delete(oldestKey);
  }
}

export function rateLimit(options: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const { key, limit, windowMs } = options;
  cleanupBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    const resetAt = now + windowMs;
    const entry = { count: 1, resetAt };
    buckets.set(key, entry);
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export function formatRetryAfterMs(resetAt: number) {
  const ms = Math.max(0, resetAt - Date.now());
  return String(Math.ceil(ms / 1000));
}

export function rateLimitRequest(
  headers: Headers,
  options: { scope: string; limit: number; windowMs: number }
) {
  return rateLimit({
    key: `${options.scope}:${getClientIp(headers)}`,
    limit: options.limit,
    windowMs: options.windowMs,
  });
}
