import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "lh3.googleusercontent.com" },
            { protocol: "https", hostname: "res.cloudinary.com" },
            { protocol: "https", hostname: "api.producthunt.com" },
            { protocol: "https", hostname: "m.media-amazon.com" },
            { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
            { protocol: "https", hostname: "encrypted-tbn3.gstatic.com" },
            { protocol: "https", hostname: "boxtudio.in" },
            { protocol: "https", hostname: "www.elinchrom.com" },
            { protocol: "https", hostname: "cdn-icons-png.flaticon.com" },
            { protocol: "http", hostname: "127.0.0.1" },
        ],
        formats: ['image/avif', 'image/webp'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },
    compress: true,
    poweredByHeader: false,
    reactStrictMode: true,
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: `
                            default-src 'self';
                            script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://maps.googleapis.com https://va.vercel-scripts.com https://sdk.cashfree.com;
                            style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
                            img-src 'self' blob: data: https://lh3.googleusercontent.com https://res.cloudinary.com https://api.producthunt.com https://m.media-amazon.com https://encrypted-tbn0.gstatic.com https://encrypted-tbn3.gstatic.com https://boxtudio.in https://www.elinchrom.com https://cdn-icons-png.flaticon.com https://maps.gstatic.com https://maps.googleapis.com;
                            font-src 'self' https://fonts.gstatic.com;
                            frame-src 'self' https://sdk.cashfree.com https://www.google.com;
                            connect-src 'self' https://vitals.vercel-insights.com https://api.cloudinary.com https://maps.googleapis.com https://sdk.cashfree.com;
                        `.replace(/\s{2,}/g, ' ').trim()
                    }
                ]
            }
        ];
    },
};

export default nextConfig;
