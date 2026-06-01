import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    allowedDevOrigins: ['192.168.1.3'],
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
            { protocol: 'https', hostname: '*.r2.dev' },
            { protocol: 'https', hostname: '*.cloudflarestorage.com' },
            { protocol: 'https', hostname: 'api.producthunt.com' },
            { protocol: 'https', hostname: 'm.media-amazon.com' },
            { protocol: 'https', hostname: 'encrypted-tbn0.gstatic.com' },
            { protocol: 'https', hostname: 'encrypted-tbn3.gstatic.com' },
            { protocol: 'https', hostname: 'boxtudio.in' },
            { protocol: 'https', hostname: 'www.elinchrom.com' },
            { protocol: 'https', hostname: 'cdn-icons-png.flaticon.com' },
            { protocol: 'https', hostname: 'assets.contcave.com' },
            { protocol: 'http', hostname: '127.0.0.1' }
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
    },
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net https://www.google-analytics.com https://maps.googleapis.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: blob: https:",
                            "connect-src 'self' https://*.ably.io wss://*.ably.io https://api.cashfree.com https://sandbox.cashfree.com https://maps.googleapis.com",
                            "frame-src 'none'",
                            "object-src 'none'",
                            "base-uri 'self'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
}

export default nextConfig
