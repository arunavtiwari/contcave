"use server";

import { google } from "googleapis";

import { auth } from "@/auth";
import prisma from "@/lib/prismadb";

function isObjectId(value: string) {
    return /^[0-9a-fA-F]{24}$/.test(value);
}

async function refreshCalendarAccessToken(account: {
    refresh_token: string;
}): Promise<{ access_token: string; expires_in?: number; refresh_token?: string }> {
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
            refresh_token: account.refresh_token,
        }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
        throw new Error(`Failed to refresh token: ${refreshedTokens.error || "Unknown error"}`);
    }

    return refreshedTokens;
}

/**
 * Fetch calendar events for a listing
 */
export async function getCalendarEventsAction(listingId?: string) {
    try {
        let accessToken: string | null = null;
        let googleAccount: {
            id: string;
            refresh_token: string | null;
            access_token: string | null;
            provider: string;
        } | null | undefined = null;

        if (listingId) {
            let listing;
            if (isObjectId(listingId)) {
                listing = await prisma.listing.findUnique({
                    where: { id: listingId },
                    include: { user: { include: { accounts: true } } },
                });
            } else {
                listing = await prisma.listing.findUnique({
                    where: { slug: listingId },
                    include: { user: { include: { accounts: true } } },
                });
            }

            if (!listing || !listing.user) return [];

            const owner = listing.user as any;
            googleAccount = owner.accounts.find(
                (account: any) => account.provider === "google-calendar"
            );

            if (!googleAccount || !googleAccount.access_token) return [];

            accessToken = googleAccount.access_token;
        } else {
            const session = await auth();
            if (!session || !session.calendarAccessToken) return [];
            accessToken = session.calendarAccessToken;
        }

        if (!accessToken) return [];

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({ access_token: accessToken });

        const calendar = google.calendar({
            version: "v3",
            auth: oauth2Client,
        });

        const timeMin = new Date();
        timeMin.setMonth(timeMin.getMonth() - 1);

        const timeMax = new Date();
        timeMax.setMonth(timeMax.getMonth() + 2);

        try {
            const response = await calendar.events.list({
                calendarId: "primary",
                timeMin: timeMin.toISOString(),
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
            });

            return response.data.items || [];
        } catch (error: unknown) {
            const err = error as any;
            const isInvalidCredentials =
                err.code === 401 ||
                err.status === 401 ||
                (err.message && (
                    err.message.toLowerCase().includes("invalid credentials") ||
                    err.message.includes("invalid_grant") ||
                    err.message.toLowerCase().includes("unauthorized")
                ));

            if (isInvalidCredentials && googleAccount && googleAccount.refresh_token) {
                const refreshedTokens = await refreshCalendarAccessToken({
                    refresh_token: googleAccount.refresh_token,
                });

                await prisma.account.update({
                    where: { id: googleAccount.id },
                    data: {
                        access_token: refreshedTokens.access_token,
                        expires_at: refreshedTokens.expires_in
                            ? Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
                            : null,
                    },
                });

                oauth2Client.setCredentials({ access_token: refreshedTokens.access_token });
                const retryResponse = await calendar.events.list({
                    calendarId: "primary",
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: "startTime",
                });

                return retryResponse.data.items || [];
            }
            throw error;
        }
    } catch (error: unknown) {
        console.error('[getCalendarEventsAction] Error:', error);
        return [];
    }
}
