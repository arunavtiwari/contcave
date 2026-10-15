const PERMISSIONS_POLICY = 'camera=(), microphone=()'

export const SECURITY_HEADERS: Record<string, string> = {
    'X-DNS-Prefetch-Control': 'on',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY
}

export function buildCSP(nonce?: string): string {
    const directives: Record<string, string[]> = {
        'default-src': ["'self'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'", 'https://sandbox.cashfree.com', 'https://api.cashfree.com', 'https://sbox.cashfree.com', 'https://www.facebook.com'],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],

        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://tagmanager.google.com'],
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
            'https://www.googletagmanager.com',
            'https://*.googletagmanager.com',
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
            'https://analytics.google.com',
            'https://*.doubleclick.net',
            'https://stats.g.doubleclick.net',
            'https://www.googleadservices.com',
            'https://googleads.g.doubleclick.net',
            'https://pagead2.googlesyndication.com',
            'https://www.google.co.in',
            'https://www.google.com',
            'https://*.google.com',
            'https://vercel.live',
            'wss://vercel.live'
        ],

        'frame-src': ["'self'", 'https://www.google.com', 'https://td.doubleclick.net', 'https://www.googletagmanager.com', 'https://sdk.cashfree.com', 'https://sandbox.cashfree.com', 'https://cashfree.com', 'https://vercel.live', 'https://www.facebook.com'],
        'script-src': [
            "'self'",
            nonce ? `'nonce-${nonce}'` : '',
            nonce ? "'strict-dynamic'" : '',
            "'wasm-unsafe-eval'",
            process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : '',
            "'unsafe-inline'",
            // Google tags. Ignored by browsers that honour 'strict-dynamic' above (the nonce already
            // admits GTM and what it loads), but needed by older browsers and checked by GTM diagnostics.
            'https://*.googletagmanager.com',
            'https://tagmanager.google.com',
            'https://www.google-analytics.com',
            'https://www.googleadservices.com',
            'https://googleads.g.doubleclick.net',
            'https://connect.facebook.net'
        ].filter(Boolean)
    }

    return Object.entries(directives)
        .map(([k, v]) => `${k} ${Array.from(new Set(v)).join(' ')}`)
        .join('; ')
}
