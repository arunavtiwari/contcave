import { NextResponse, type NextRequest } from 'next/server';
import { authConfig } from './auth.config';
import NextAuth from 'next-auth';

const { auth } = NextAuth(authConfig);

export async function proxy(request: NextRequest) {
    // NextAuth's auth() expects a Request-like object. NextRequest is compatible at runtime.
    // We cast via unknown to satisfy TypeScript while maintaining type safety
    const authResult = await auth(request as unknown as Parameters<typeof auth>[0]);

    if (authResult) {
        return authResult;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:jpg|jpeg|gif|png|svg|ico|webp)).*)",
        "/Profile/:path*",
        "/bookings/:path*",
        "/chat/:path*",
        "/favorites/:path*",
        "/payments/:path*",
        "/properties/:path*",
        "/reservations/:path*",
        "/profile-transaction/:path*",
    ],
};
