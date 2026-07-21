import type { NextAuthConfig } from "next-auth";

import { UserRole } from "@/types/user";

const PROTECTED_ROUTES = [
    '/dashboard',
    '/profile',
    '/bookings',
    '/chat',
    '/favorites',
    '/payments',
    '/properties',
    '/reservations',
    '/profile-transaction',
    '/admin/dashboard',
] as const;

const ADMIN_ROUTES = ['/admin/dashboard'] as const;

const PUBLIC_API_ROUTES = [
    '/api/auth',
    '/api/register',
    '/api/payments/cashfree/webhook',
] as const;

function logSecurityEvent(
    event: 'auth_success' | 'auth_failure' | 'unauthorized_access',
    context: { path: string; user?: string; ip?: string }
) {
    const timestamp = new Date().toISOString();
    console.warn(
        `[${timestamp}] Security Event: ${event} - Path: ${context.path}${
            context.user ? ` - User: ${context.user}` : ''
        }`
    );
}

function matchesRoute(pathname: string, route: string) {
    return pathname === route || pathname.startsWith(`${route}/`);
}

export const authConfig = {
    providers: [],
    pages: {
        signIn: "/",
        error: "/",
    },
    debug: false,
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;

            const isPublicAPI = PUBLIC_API_ROUTES.some(route => matchesRoute(pathname, route));
            if (isPublicAPI) {
                return true;
            }

            const isProtected = PROTECTED_ROUTES.some(route => matchesRoute(pathname, route));

            if (isProtected) {
                const isAdminRoute = ADMIN_ROUTES.some(route => matchesRoute(pathname, route));
                if (!isLoggedIn) {
                    logSecurityEvent('unauthorized_access', { path: pathname });
                    if (isAdminRoute) {
                        return Response.redirect(new URL('/admin', nextUrl));
                    }
                    return false;
                }

                // Admin routes require the ADMIN role in addition to being logged in
                if (isAdminRoute && auth?.user?.role !== 'ADMIN') {
                    logSecurityEvent('unauthorized_access', {
                        path: pathname,
                        user: auth.user?.email || auth.user?.id,
                    });
                    return false;
                }

                logSecurityEvent('auth_success', {
                    path: pathname,
                    user: auth.user?.email || auth.user?.id,
                });
                return true;
            }

            return true;
        },
        async jwt({ token, account, user }) {
            if (account && user) {
                token.id = user.id;

                if ('role' in user) {
                    token.role = user.role;
                }
                if ('phone' in user) {
                    token.phone = user.phone;
                }
                if ('is_verified' in user) {
                    token.is_verified = user.is_verified;
                }

                return token;
            }

            return token;
        },
        async session({ session, token }) {
            if (token.id) {
                session.user.id = token.id as string;
            }

            if (token.role !== undefined) {
                session.user.role = token.role as UserRole;
            }
            if (token.phone !== undefined) {
                session.user.phone = token.phone as string | null;
            }
            if (token.is_verified !== undefined) {
                session.user.is_verified = token.is_verified as boolean;
            }

            return session;
        },
    },
    trustHost: true,
} satisfies NextAuthConfig;
