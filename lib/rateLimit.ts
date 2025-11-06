/**
 * Production-grade rate limiting utility
 * Supports both Redis (production) and in-memory (development) backends
 */

type BucketKey = string;

interface RateLimitOptions {
    key: string;
    limit: number;
    windowMs: number;
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
}

// In-memory storage for development/fallback
const buckets: Map<BucketKey, { count: number; resetAt: number }> = new Map();

// Cleanup old entries every 5 minutes to prevent memory leaks
if (typeof setInterval !== 'undefined') {
    setInterval(() => {
        const now = Date.now();
        for (const [key, bucket] of buckets.entries()) {
            if (bucket.resetAt <= now) {
                buckets.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

/**
 * Redis-based rate limiting (production)
 * Uses Upstash Redis REST API - works in serverless environments
 */
async function rateLimitRedis(
    options: RateLimitOptions
): Promise<RateLimitResult> {
    const { key, limit, windowMs } = options;
    const now = Date.now();
    const windowStart = now - (now % windowMs);
    const redisKey = `rate-limit:${key}:${windowStart}`;

    try {
        const response = await fetch(
            `${process.env.UPSTASH_REDIS_REST_URL}/pipeline`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([
                    ['INCR', redisKey],
                    ['EXPIRE', redisKey, Math.ceil(windowMs / 1000)],
                    ['TTL', redisKey],
                ]),
            }
        );

        if (!response.ok) {
            throw new Error('Redis rate limit failed');
        }

        const results = await response.json();
        const count = results[0].result || 0;
        const ttl = results[2].result || Math.ceil(windowMs / 1000);
        const resetAt = now + (ttl * 1000);

        if (count > limit) {
            return { allowed: false, remaining: 0, resetAt };
        }

        return {
            allowed: true,
            remaining: Math.max(0, limit - count),
            resetAt,
        };
    } catch (error) {
        console.error('Redis rate limit error, falling back to in-memory:', error);
        // Fallback to in-memory if Redis fails
        return rateLimitMemory(options);
    }
}

/**
 * In-memory rate limiting (development/fallback)
 */
function rateLimitMemory(options: RateLimitOptions): RateLimitResult {
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
    return {
        allowed: true,
        remaining: Math.max(0, limit - bucket.count),
        resetAt: bucket.resetAt,
    };
}

/**
 * Main rate limit function
 * Automatically uses Redis in production if configured, otherwise falls back to in-memory
 * Always returns a Promise for consistency
 */
export async function rateLimit(
    options: RateLimitOptions
): Promise<RateLimitResult> {
    // Use Redis if credentials are available (production)
    if (
        process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
        return rateLimitRedis(options);
    }

    // Fallback to in-memory (development)
    return Promise.resolve(rateLimitMemory(options));
}

export function formatRetryAfterMs(resetAt: number): string {
    const ms = Math.max(0, resetAt - Date.now());
    return String(Math.ceil(ms / 1000));
}

