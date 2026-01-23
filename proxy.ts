import { type NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';

import { createErrorResponse, handleRouteError } from '@/lib/api-utils';

import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

const securityHeaders = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob: https://maps.gstatic.com https://maps.googleapis.com; connect-src 'self' https://api.cashfree.com https://graph.facebook.com https://www.googleapis.com https://maps.googleapis.com https://api.cloudinary.com wss:; frame-src 'self' https://www.google.com;"
} as const;

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 100,
    blockDuration: 15 * 60 * 1000,
} as const;

function getClientIP(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'unknown'
    );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (rateLimitStore.size > 10000) {
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetTime < now) {
                rateLimitStore.delete(key);
            }
        }
    }

    if (!record || record.resetTime < now) {
        rateLimitStore.set(ip, {
            count: 1,
            resetTime: now + RATE_LIMIT.windowMs,
        });
        return {
            allowed: true,
            remaining: RATE_LIMIT.maxRequests - 1,
            resetTime: now + RATE_LIMIT.windowMs,
        };
    }

    if (record.count >= RATE_LIMIT.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: record.resetTime,
        };
    }

    record.count += 1;
    return {
        allowed: true,
        remaining: RATE_LIMIT.maxRequests - record.count,
        resetTime: record.resetTime,
    };
}

function logSecurityEvent(
    event: 'auth_success' | 'auth_failure' | 'rate_limit' | 'error',
    context: Record<string, unknown>
): void {
    if (process.env.NODE_ENV === 'production') {
        const timestamp = new Date().toISOString();
        console.warn(`[Security Event] ${event}`, JSON.stringify({ timestamp, event, ...context }));
    }
}

const publicPaths = [
    '/api/auth',
    '/api/register',
    '/api/generate_otp',
    '/api/verify_email',
    '/api/payments/cashfree/webhook',
    '/',
    '/about',
    '/blog',
    '/privacy-policy',
    '/terms-and-conditions',
    '/forgot-password',
    '/reset-password',
];

function isPublicPath(pathname: string): boolean {
    return publicPaths.some(path => pathname.startsWith(path));
}

export async function proxy(request: NextRequest) {
    const startTime = Date.now();
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    const ip = getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            logSecurityEvent('rate_limit', { path: pathname, method, ip, userAgent });

            const rateLimitResponse = createErrorResponse(
                'Rate limit exceeded. Please try again later.',
                429
            );
            rateLimitResponse.headers.set('Retry-After', String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)));
            rateLimitResponse.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests));
            rateLimitResponse.headers.set('X-RateLimit-Remaining', '0');
            rateLimitResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetTime / 1000)));
            return rateLimitResponse;
        }

        if (!isPublicPath(pathname)) {
            try {
                const authResult = await (auth as unknown as (req: NextRequest) => Promise<Response | void>)(request);

                if (authResult instanceof Response) {
                    if (authResult.status !== 200) {
                        if (authResult.status === 401 || authResult.status === 403) {
                            logSecurityEvent('auth_failure', { path: pathname, method, ip, userAgent });
                        }
                        return authResult;
                    }
                }
            } catch (authError) {
                logSecurityEvent('error', {
                    path: pathname,
                    method,
                    ip,
                    userAgent,
                    error: authError instanceof Error ? authError.message : 'Unknown auth error',
                });

                if (process.env.NODE_ENV === 'production') {
                    return createErrorResponse('An error occurred during authentication', 500);
                }
                throw authError;
            }
        }

        const response = NextResponse.next();

        Object.entries(securityHeaders).forEach(([key, value]) => {
            response.headers.set(key, value);
        });

        response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests));
        response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
        response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetTime / 1000)));

        const duration = Date.now() - startTime;
        response.headers.set('X-Response-Time', `${duration}ms`);

        const origin = request.headers.get('origin');
        if (origin && process.env.ALLOWED_ORIGINS?.split(',').includes(origin)) {
            response.headers.set('Access-Control-Allow-Origin', origin);
            response.headers.set('Access-Control-Allow-Credentials', 'true');
            response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
            response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        }

        return response;
    } catch (error) {
        logSecurityEvent('error', {
            path: pathname,
            method,
            ip,
            userAgent,
            error: error instanceof Error ? error.message : 'Unknown error',
        });

        const errorResponse = handleRouteError(error, `proxy: ${pathname}`);
        Object.entries(securityHeaders).forEach(([key, value]) => {
            errorResponse.headers.set(key, value);
        });
        return errorResponse;
    }
}

export const config = {
    matcher: [
        {
            source: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff|woff2|ttf|eot|css|js)).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' },
            ],
        },
        '/Profile/:path*',
        '/bookings/:path*',
        '/chat/:path*',
        '/favorites/:path*',
        '/payments/:path*',
        '/properties/:path*',
        '/reservations/:path*',
        '/profile-transaction/:path*',
    ],
};
