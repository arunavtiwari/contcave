type BucketKey = string;

const buckets: Map<BucketKey, { count: number; resetAt: number }> = new Map();

export function rateLimit(options: { key: string; limit: number; windowMs: number }): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const { key, limit, windowMs } = options;
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

export function formatRetryAfterMs(resetAt: number): string {
    const ms = Math.max(0, resetAt - Date.now());
    return String(Math.ceil(ms / 1000));
}


