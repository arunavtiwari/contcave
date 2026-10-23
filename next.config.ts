import type { NextConfig } from 'next'

import { HTML_ONLY_CRAWLER_UA_RE } from './lib/crawlers'
import { buildCSP, SECURITY_HEADERS } from './lib/http/securityHeaders'

const nextConfig: NextConfig = {
    serverExternalPackages: ['jsdom', 'isomorphic-dompurify'],
    htmlLimitedBots: HTML_ONLY_CRAWLER_UA_RE,
    allowedDevOrigins: ['192.168.1.3', 'admin.localhost', '*.localhost'],
    images: {
        loader: 'custom',
        loaderFile: './lib/cloudflare-image-loader.ts',
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
            ...(process.env.NODE_ENV !== 'production'
                ? [{ protocol: 'http' as const, hostname: '127.0.0.1' }]
                : [])
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 1080, 1920],
        imageSizes: [96, 256, 384]
    },
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    async redirects() {
        return [
            { source: '/home', destination: '/studios', permanent: true },
            { source: '/listings', destination: '/studios', permanent: true },
            { source: '/listings/:listingId', destination: '/studio/:listingId', permanent: true },
        ];
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    ...Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
                    { key: 'Content-Security-Policy', value: buildCSP() },
                ],
            },
        ];
    },
}

export default nextConfig
