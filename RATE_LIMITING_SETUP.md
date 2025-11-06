# Rate Limiting Setup Guide

## Overview

This application now has **production-grade rate limiting** that works across all routes via middleware. The system automatically uses Redis in production (if configured) or falls back to in-memory storage for development.

## Features

✅ **Distributed rate limiting** - Works across multiple server instances  
✅ **Automatic cleanup** - Prevents memory leaks  
✅ **Route-specific limits** - Different limits for different endpoints  
✅ **Production-ready** - Redis support for serverless environments  
✅ **Development-friendly** - Works without Redis in dev mode  

## Current Rate Limits

| Route | Limit | Window |
|-------|-------|--------|
| `/api/register` | 5 requests | 15 minutes |
| `/api/generate_otp` | 5 requests | 15 minutes |
| `/api/verify_email` | 10 requests | 1 minute |
| `/api/reviews` | 10 requests | 1 minute |
| `/api/reservations` | 20 requests | 1 minute |
| `/api/payment-details` | 30 requests | 1 minute |
| `/api/billing` | 20 requests | 1 minute |
| Other API routes | 60 requests | 1 minute |
| Pages | 100 requests | 1 minute |

## Setup for Production (Recommended)

### Option 1: Upstash Redis (Recommended for Serverless)

1. **Create a free Upstash Redis database:**
   - Go to https://upstash.com/
   - Sign up for free
   - Create a new Redis database
   - Choose a region close to your deployment

2. **Get your credentials:**
   - Copy the `UPSTASH_REDIS_REST_URL`
   - Copy the `UPSTASH_REDIS_REST_TOKEN`

3. **Add to your environment variables:**
   ```env
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPstASH_REDIS_REST_TOKEN=your-token-here
   ```

4. **That's it!** The rate limiter will automatically use Redis in production.

### Option 2: Self-Hosted Redis

If you have your own Redis instance:

1. Install `@upstash/redis` or `ioredis`
2. Update `lib/rateLimit.ts` to use your Redis client
3. Set environment variables accordingly

## Development Mode

In development, the rate limiter automatically uses in-memory storage. No setup required!

## How It Works

1. **Middleware intercepts all requests** before they reach your routes
2. **Rate limit is checked** based on IP address + route path
3. **If limit exceeded:** Returns 429 with `Retry-After` header
4. **If allowed:** Request continues to NextAuth and your routes

## Response Headers

When rate limited, responses include:
- `Retry-After`: Seconds until the limit resets
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Timestamp when limit resets

## Customizing Limits

Edit `middleware.ts` to adjust rate limits:

```typescript
const RATE_LIMITS = {
  "/api/register": { limit: 5, windowMs: 15 * 60 * 1000 },
  // Add your custom limits here
};
```

## Testing

Test rate limiting by making rapid requests:

```bash
# Test registration endpoint
for i in {1..10}; do curl -X POST http://localhost:3000/api/register; done
```

After 5 requests, you should receive 429 responses.

## Monitoring

- Check your Upstash dashboard for Redis usage
- Monitor 429 responses in your logs
- Adjust limits based on your traffic patterns

## Notes

- Rate limiting is based on IP address
- In production with Redis, limits are shared across all server instances
- In development, limits reset on server restart
- Memory cleanup runs automatically every 5 minutes

