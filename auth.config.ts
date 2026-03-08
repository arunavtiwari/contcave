import type { NextAuthConfig } from "next-auth";

async function refreshCalendarAccessToken(token: Record<string, unknown>) {
    try {
        const url = "https://oauth2.googleapis.com/token";
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_CLIENT_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.calendarRefreshToken as string,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            throw refreshedTokens;
        }

        return {
            ...token,
            calendarAccessToken: refreshedTokens.access_token,
            calendarAccessTokenExpires:
                Date.now() + refreshedTokens.expires_in * 1000,
            calendarRefreshToken:
                refreshedTokens.refresh_token ?? token.calendarRefreshToken,
        };
    } catch (error) {
        console.error("Error refreshing calendar access token:", error);
        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}

const PROTECTED_ROUTES = [
    '/profile',
    '/bookings',
    '/chat',
    '/favorites',
    '/payments',
    '/properties',
    '/reservations',
    '/profile-transaction'
] as const;

const PUBLIC_API_ROUTES = [
    '/api/auth',
    '/api/register',
    '/api/generate_otp',
    '/api/verify_email',
    '/api/payments/cashfree/webhook',
] as const;

function logSecurityEvent(
    event: 'auth_success' | 'auth_failure' | 'unauthorized_access',
    context: { path: string; user?: string; ip?: string }
) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Security Event: ${event} - Path: ${context.path}${context.user ? ` - User: ${context.user}` : ''
        }`;

    if (process.env.NODE_ENV === 'production') {
        console.warn(logMessage);
    } else {
        console.warn(logMessage);
    }
}

export const authConfig = {
    providers: [],
    pages: {
        signIn: "/",
        error: "/",
    },
    debug: process.env.NODE_ENV === "development",
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const pathname = nextUrl.pathname;

            const isPublicAPI = PUBLIC_API_ROUTES.some(route =>
                pathname.startsWith(route)
            );
            if (isPublicAPI) {
                return true;
            }

            const isProtected = PROTECTED_ROUTES.some(route =>
                pathname.startsWith(route)
            );

            if (isProtected) {
                if (!isLoggedIn) {
                    logSecurityEvent('unauthorized_access', {
                        path: pathname,
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

                if ('is_owner' in user) {
                    token.is_owner = user.is_owner;
                }
                if ('phone' in user) {
                    token.phone = user.phone;
                }
                if ('is_verified' in user) {
                    token.is_verified = user.is_verified;
                }

                if (account.provider === "google-calendar") {
                    token.calendarAccessToken = account.access_token;
                    token.calendarRefreshToken = account.refresh_token;
                    token.calendarAccessTokenExpires =
                        Date.now() + Number(account.expires_in) * 1000;
                } else if (account.provider === "google") {
                    token.accessToken = account.access_token;
                }
                return token;
            }

            if (
                token.calendarAccessToken &&
                token.calendarAccessTokenExpires &&
                Date.now() < Number(token.calendarAccessTokenExpires)
            ) {
                return token;
            }

            if (token.calendarRefreshToken) {
                return await refreshCalendarAccessToken(token);
            }

            return token;
        },
        async session({ session, token }) {
            if (token.id) {
                session.user.id = token.id as string;
            }

            session.accessToken = token.accessToken as string | undefined;
            session.calendarAccessToken = token.calendarAccessToken as
                | string
                | undefined;
            session.calendarRefreshToken = token.calendarRefreshToken as
                | string
                | undefined;

            if (token.is_owner !== undefined) {
                session.user.is_owner = token.is_owner as boolean;
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
