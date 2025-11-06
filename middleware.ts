import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, formatRetryAfterMs } from "@/lib/rateLimit";

// Rate limiting configuration
const RATE_LIMITS = {
  // API routes - stricter limits
  "/api/register": { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  "/api/generate_otp": { limit: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 minutes
  "/api/verify_email": { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  "/api/reviews": { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  "/api/reservations": { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
  "/api/payment-details": { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
  "/api/billing": { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
  // Default for all other API routes
  "/api": { limit: 60, windowMs: 60 * 1000 }, // 60 per minute
  // Pages - more lenient
  default: { limit: 100, windowMs: 60 * 1000 }, // 100 per minute
};

function getRateLimitConfig(pathname: string) {
  // Check for specific route matches first
  for (const [route, config] of Object.entries(RATE_LIMITS)) {
    if (pathname.startsWith(route) && route !== "/api") {
      return config;
    }
  }
  // Check if it's an API route
  if (pathname.startsWith("/api")) {
    return RATE_LIMITS["/api"];
  }
  // Default for pages
  return RATE_LIMITS.default;
}

function getClientIdentifier(req: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  
  // For authenticated users, you could also use user ID if available
  // For now, we'll use IP + pathname as the key
  return ip;
}

// Rate limiting middleware (async for Redis support)
async function rateLimitMiddleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const config = getRateLimitConfig(pathname);
  const identifier = getClientIdentifier(req);
  const key = `${pathname}:${identifier}`;

  const result = await rateLimit({
    key,
    limit: config.limit,
    windowMs: config.windowMs,
  });

  if (!result.allowed) {
    const retryAfter = formatRetryAfterMs(result.resetAt);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": retryAfter,
          "X-RateLimit-Limit": String(config.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }

  return null; // Continue to next middleware
}

// Combine NextAuth with rate limiting
export default withAuth(
  async function middleware(req) {
    // Apply rate limiting to all requests
    const rateLimitResponse = await rateLimitMiddleware(req);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // NextAuth will handle authentication for protected routes
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Protected routes require authentication
        const pathname = req.nextUrl.pathname;
        const protectedRoutes = ["/trips", "/reservations", "/properties", "/favorites"];
        return protectedRoutes.some((route) => pathname.startsWith(route)) 
          ? !!token 
          : true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
