import { type NextRequest, NextResponse } from 'next/server'

import { createErrorResponse, handleRouteError } from '@/lib/api-utils'
import { getClientIp } from '@/lib/http/requestMeta'

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

const ROUTES_WITH_DEDICATED_REQUEST_GUARDS = new Set([
    '/api/ablychat',
    '/api/meta-capi',
    '/api/notifications/token',
    '/api/payments/cashfree/process',
    '/api/payments/cashfree/webhook',
    '/api/upload/presign',
    '/api/user/verify/aadhaar',
    '/api/whatsapp/webhook',
    '/api/cron/qstash',
])

function hasDedicatedRequestGuard(pathname: string): boolean {
    return ROUTES_WITH_DEDICATED_REQUEST_GUARDS.has(pathname)
        || pathname.startsWith('/api/pay/charge/')
}

function isAdminDomainHost(hostname: string): boolean {
    const host = hostname.split(':')[0]?.toLowerCase() ?? ''
    return host === 'admin.contcave.com'
        || host === 'staging.admin.contcave.com'
        || host.startsWith('admin.')
        || host.includes('.admin.')
}

function isAuthApiPath(pathname: string): boolean {
    return pathname === '/api/auth' || pathname.startsWith('/api/auth/')
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

function buildCSP(nonce: string): string {

    const directives: Record<string, string[]> = {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'", 'https://sandbox.cashfree.com', 'https://api.cashfree.com', 'https://sbox.cashfree.com', 'https://www.facebook.com'],
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
            process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || '',
            'https://api.producthunt.com',
            'https://m.media-amazon.com',
            'https://encrypted-tbn0.gstatic.com',
            'https://encrypted-tbn3.gstatic.com',
            'https://boxtudio.in',
            'https://www.elinchrom.com',
            'https://cdn-icons-png.flaticon.com',
            'https://www.facebook.com'
        ],

        'media-src': [
            "'self'",
            'blob:',
            process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || '',
        ],

        'connect-src': [
            "'self'",
            'ws:',
            'wss:',
            'blob:',
            'data:',
            'https://api.cashfree.com',
            'https://sdk.cashfree.com',
            'https://*.r2.cloudflarestorage.com',
            process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || '',
            'https://maps.googleapis.com',
            'https://fonts.googleapis.com',
            'https://fonts.gstatic.com',
            'https://graph.facebook.com',
            'https://connect.facebook.net',
            'https://www.facebook.com',
            'https://www.googleapis.com',
            'https://vitals.vercel-insights.com',
            'https://*.ably.io',
            'wss://*.ably.io',
            'https://*.ably-realtime.com',
            'wss://*.ably-realtime.com',
            'https://*.ably.net',
            'wss://*.ably.net',
            'https://capig.datah04.com',
            'https://vercel.live',
            'wss://vercel.live'
        ],

        'frame-src': ["'self'", 'https://www.google.com', 'https://sdk.cashfree.com', 'https://sandbox.cashfree.com', 'https://cashfree.com', 'https://vercel.live', 'https://www.facebook.com'],
        'script-src': [
            "'self'",
            `'nonce-${nonce}'`,
            "'strict-dynamic'",
            "'wasm-unsafe-eval'",
            process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : '',
            "'unsafe-inline'"
        ].filter(Boolean)
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

function applySecurityHeaders(res: NextResponse, pathname: string, nonce: string): void {
    res.headers.set('X-DNS-Prefetch-Control', 'on')
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
    res.headers.set('X-Frame-Options', 'DENY')
    res.headers.set('X-Content-Type-Options', 'nosniff')
    res.headers.set('X-XSS-Protection', '1; mode=block')
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    res.headers.set('Permissions-Policy', permissionsPolicyForPath(pathname))
    res.headers.set('Content-Security-Policy', buildCSP(nonce))
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

function finalizeResponse(
    request: NextRequest,
    response: NextResponse,
    pathname: string,
    nonce: string,
    start: number
): NextResponse {
    applySecurityHeaders(response, pathname, nonce)
    applyCors(request, response)
    response.headers.set('X-Response-Time', `${Date.now() - start}ms`)
    return response
}

export async function proxy(request: NextRequest) {
    const start = Date.now()
    const pathname = request.nextUrl.pathname
    const hostname = request.headers.get('host') || request.nextUrl.hostname
    const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
    const contentSecurityPolicy = buildCSP(nonce)

    const isAdminDomain = isAdminDomainHost(hostname)
    if (isAdminDomain) {
        if (pathname.startsWith('/api') && !isAuthApiPath(pathname)) {
            return finalizeResponse(request, new NextResponse(null, { status: 404 }), pathname, nonce, start)
        }

        if (!pathname.startsWith('/admin') && !pathname.startsWith('/_next') && !isAuthApiPath(pathname)) {
            const url = new URL(request.nextUrl)
            url.pathname = `/admin${pathname === '/' ? '' : pathname}`
            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-nonce', nonce)
            requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)
            return finalizeResponse(
                request,
                NextResponse.rewrite(url, { request: { headers: requestHeaders } }),
                pathname,
                nonce,
                start
            )
        }
    } else if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        return finalizeResponse(request, new NextResponse(null, { status: 404 }), pathname, nonce, start)
    }

    const method = request.method
    const ip = getClientIp(request.headers)
    const userAgent = request.headers.get('user-agent') || 'unknown'

    try {
        const bypassGlobalLimit = process.env.NODE_ENV !== 'production' || hasDedicatedRequestGuard(pathname)
        const rl = bypassGlobalLimit
            ? { allowed: true, remaining: RATE_LIMIT.maxRequests, resetTime: Date.now() + RATE_LIMIT.windowMs }
            : checkRateLimit(ip)
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

            applySecurityHeaders(res, pathname, nonce)
            applyCors(request, res)
            res.headers.set('X-Response-Time', `${Date.now() - start}ms`)
            return res
        }

        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-nonce', nonce)
        requestHeaders.set('Content-Security-Policy', contentSecurityPolicy)
        const res = NextResponse.next({ request: { headers: requestHeaders } })

        applySecurityHeaders(res, pathname, nonce)
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
        applySecurityHeaders(res, pathname, nonce)
        applyCors(request, res)
        res.headers.set('X-Response-Time', `${Date.now() - start}ms`)
        return res
    }
}

export const config = {
    matcher: [
        {
            source:
                '/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp|woff|woff2|ttf|eot|css|js)).*)',
            missing: [
                { type: 'header', key: 'next-router-prefetch' },
                { type: 'header', key: 'purpose', value: 'prefetch' }
            ]
        },
        '/profile/:path*',
        '/bookings/:path*',
        '/chat/:path*',
        '/favorites/:path*',
        '/payments/:path*',
        '/properties/:path*',
        '/reservations/:path*',
        '/profile-transaction/:path*'
    ]
}
