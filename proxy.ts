import { type NextRequest, NextResponse } from 'next/server'
import NextAuth from 'next-auth'

import { createErrorResponse, handleRouteError } from '@/lib/api-utils'

import { authConfig } from './auth.config'

const { auth } = NextAuth(authConfig)

type RateRecord = {
    count: number
    resetTime: number
    blockedUntil?: number
}

const RATE_LIMIT = {
    windowMs: 60 * 1000,
    maxRequests: 100,
    blockDuration: 15 * 60 * 1000
} as const

const rateLimitStore = new Map<string, RateRecord>()

const PUBLIC_PATH_PREFIXES = [
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
    '/reset-password'
]

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATH_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function getClientIP(request: NextRequest): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'unknown'
    )
}

function cleanupStore(now: number): void {
    if (rateLimitStore.size <= 10000) return
    for (const [ip, rec] of rateLimitStore.entries()) {
        const expired = rec.resetTime < now && (!rec.blockedUntil || rec.blockedUntil < now)
        if (expired) rateLimitStore.delete(ip)
    }
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number; blockedUntil?: number } {
    const now = Date.now()
    cleanupStore(now)

    const rec = rateLimitStore.get(ip)

    if (rec?.blockedUntil && rec.blockedUntil > now) {
        return { allowed: false, remaining: 0, resetTime: rec.resetTime, blockedUntil: rec.blockedUntil }
    }

    if (!rec || rec.resetTime < now) {
        const next: RateRecord = { count: 1, resetTime: now + RATE_LIMIT.windowMs }
        rateLimitStore.set(ip, next)
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1, resetTime: next.resetTime }
    }

    if (rec.count + 1 > RATE_LIMIT.maxRequests) {
        rec.blockedUntil = now + RATE_LIMIT.blockDuration
        return { allowed: false, remaining: 0, resetTime: rec.resetTime, blockedUntil: rec.blockedUntil }
    }

    rec.count += 1
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - rec.count, resetTime: rec.resetTime }
}

function logSecurityEvent(
    event: 'auth_success' | 'auth_failure' | 'rate_limit' | 'error',
    context: Record<string, unknown>
): void {
    if (process.env.NODE_ENV !== 'production') return
    const timestamp = new Date().toISOString()
    console.warn(`[Security Event] ${event}`, JSON.stringify({ timestamp, event, ...context }))
}

function buildCSP(): string {
    const isDev = process.env.NODE_ENV !== 'production'

    const directives: Record<string, string[]> = {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'", 'https://sandbox.cashfree.com', 'https://api.cashfree.com', 'https://sbox.cashfree.com'],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],

        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],

        'img-src': [
            "'self'",
            'data:',
            'blob:',
            'https:',
            'https://maps.gstatic.com',
            'https://maps.googleapis.com',
            'https://lh3.googleusercontent.com',
            'https://res.cloudinary.com',
            'https://api.producthunt.com',
            'https://m.media-amazon.com',
            'https://encrypted-tbn0.gstatic.com',
            'https://encrypted-tbn3.gstatic.com',
            'https://boxtudio.in',
            'https://www.elinchrom.com',
            'https://cdn-icons-png.flaticon.com'
        ],

        'connect-src': [
            "'self'",
            'wss:',
            'https://api.cashfree.com',
            'https://sdk.cashfree.com',
            'https://api.cloudinary.com',
            'https://maps.googleapis.com',
            'https://graph.facebook.com',
            'https://www.googleapis.com',
            'https://vitals.vercel-insights.com'
        ],

        'frame-src': ["'self'", 'https://www.google.com', 'https://sdk.cashfree.com'],

        'script-src': [
            "'self'",
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://maps.googleapis.com',
            'https://va.vercel-scripts.com',
            'https://sdk.cashfree.com'
        ],

        'script-src-elem': [
            "'self'",
            'https://www.googletagmanager.com',
            'https://www.google-analytics.com',
            'https://maps.googleapis.com',
            'https://va.vercel-scripts.com',
            'https://sdk.cashfree.com'
        ]
    }

    // Dev only
    if (isDev) {
        directives['script-src'].push("'unsafe-eval'", "'unsafe-inline'")
        directives['script-src-elem'].push("'unsafe-inline'")
    }

    return Object.entries(directives)
        .map(([k, v]) => `${k} ${Array.from(new Set(v)).join(' ')}`)
        .join('; ')
}

function permissionsPolicyForPath(pathname: string): string {
    const allowGeo =
        pathname === '/home'

    return [
        'camera=()',
        'microphone=()',
        allowGeo ? 'geolocation=(self)' : 'geolocation=()'
    ].join(', ')
}

function applySecurityHeaders(res: NextResponse, pathname: string): void {
    res.headers.set('X-DNS-Prefetch-Control', 'on')
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('X-XSS-Protection', '1; mode=block')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('Permissions-Policy', permissionsPolicyForPath(pathname))
    res.headers.set('Content-Security-Policy', buildCSP())
}

function applyCors(req: NextRequest, res: NextResponse): void {
    const origin = req.headers.get('origin')
    if (!origin) return

    const allowed = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)

    if (!allowed.includes(origin)) return

    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Vary', 'Origin')
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
}

export async function proxy(request: NextRequest) {
    const start = Date.now()
    const pathname = request.nextUrl.pathname
    const method = request.method
    const ip = getClientIP(request)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    try {
        // Rate limit first
        const rl = checkRateLimit(ip)
        if (!rl.allowed) {
            logSecurityEvent('rate_limit', { path: pathname, method, ip, userAgent })

            const isBlocked = Boolean(rl.blockedUntil && rl.blockedUntil > Date.now())
            const msg = isBlocked
                ? 'Too many requests. You are temporarily blocked. Please try again later.'
                : 'Rate limit exceeded. Please try again later.'

            const res = createErrorResponse(msg, 429)

            const retryAfter = Math.ceil(((rl.blockedUntil ?? rl.resetTime) - Date.now()) / 1000)
            res.headers.set('Retry-After', String(Math.max(1, retryAfter)))

            res.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests))
            res.headers.set('X-RateLimit-Remaining', '0')
            res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetTime / 1000)))
            if (rl.blockedUntil) res.headers.set('X-RateLimit-Blocked-Until', String(Math.ceil(rl.blockedUntil / 1000)))

            applySecurityHeaders(res as unknown as NextResponse, pathname)
            applyCors(request, res as unknown as NextResponse)
            res.headers.set('X-Response-Time', `${Date.now() - start}ms`)
            return res
        }

        // Auth for protected paths
        if (!isPublicPath(pathname)) {
            try {
                const authResult = await (auth as unknown as (req: NextRequest) => Promise<Response | void>)(request)
                if (authResult instanceof Response && authResult.status !== 200) {
                    if (authResult.status === 401 || authResult.status === 403) {
                        logSecurityEvent('auth_failure', { path: pathname, method, ip, userAgent })
                    }
                    return authResult
                }
                logSecurityEvent('auth_success', { path: pathname, method, ip })
            } catch (e) {
                logSecurityEvent('error', {
                    path: pathname,
                    method,
                    ip,
                    userAgent,
                    error: e instanceof Error ? e.message : 'Unknown auth error'
                })

                if (process.env.NODE_ENV === 'production') {
                    const res = createErrorResponse('An error occurred during authentication', 500)
                    applySecurityHeaders(res as unknown as NextResponse, pathname)
                    applyCors(request, res as unknown as NextResponse)
                    res.headers.set('X-Response-Time', `${Date.now() - start}ms`)
                    return res
                }

                throw e
            }
        }

        const res = NextResponse.next()

        applySecurityHeaders(res, pathname)
        applyCors(request, res)

        res.headers.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests))
        res.headers.set('X-RateLimit-Remaining', String(rl.remaining))
        res.headers.set('X-RateLimit-Reset', String(Math.ceil(rl.resetTime / 1000)))
        res.headers.set('X-Response-Time', `${Date.now() - start}ms`)

        return res
    } catch (err) {
        logSecurityEvent('error', {
            path: pathname,
            method,
            ip,
            userAgent,
            error: err instanceof Error ? err.message : 'Unknown error'
        })

        const res = handleRouteError(err, `proxy: ${pathname}`)
        applySecurityHeaders(res as unknown as NextResponse, pathname)
        applyCors(request, res as unknown as NextResponse)
        res.headers.set('X-Response-Time', `${Date.now() - start}ms`)
        return res
    }
}

export const config = {
    matcher: [
        {
            source:
                '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff|woff2|ttf|eot|css|js)).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' }
            ]
        },
        '/Profile/:path*',
        '/bookings/:path*',
        '/chat/:path*',
        '/favorites/:path*',
        '/payments/:path*',
        '/properties/:path*',
        '/reservations/:path*',
        '/profile-transaction/:path*'
    ]
}
