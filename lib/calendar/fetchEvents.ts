import { calendar_v3, google } from "googleapis";

import prisma from "@/lib/prismadb";

async function refreshCalendarAccessToken(account: {
    refresh_token: string;
}): Promise<{ access_token: string; expires_in?: number; refresh_token?: string }> {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: account.refresh_token,
        }),
    });

    const refreshedTokens = await response.json();
    if (!response.ok) throw new Error(refreshedTokens.error || "Unknown error");
    if (!refreshedTokens.access_token) throw new Error("missing access_token");

    return refreshedTokens;
}

export async function fetchListingCalendarEvents(listingId: string) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn("[fetchListingCalendarEvents] Google API secrets missing. Skipping sync.");
        return [];
    }

    const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: {
            user: {
                select: {
                    googleCalendarConnected: true,
                    accounts: true,
                },
            },
        },
    });

    if (!listing || !listing.user) return [];
    if (!listing.user.googleCalendarConnected) return [];

    const googleAccount = listing.user.accounts.find(
        (a) => a.provider === "google-calendar"
    );

    if (!googleAccount || !googleAccount.access_token) return [];

    let accessToken = googleAccount.access_token;
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 2);

    let responseData: calendar_v3.Schema$Event[] = [];

    try {
        const response = await calendar.events.list({
            calendarId: "primary",
            timeMin: timeMin.toISOString(),
            timeMax: timeMax.toISOString(),
            singleEvents: true,
            orderBy: "startTime",
        });
        responseData = response.data.items || [];
    } catch (error: unknown) {
        const err = error as { code?: number; status?: number; message?: string };
        const normalizedMessage = (err.message || "").toLowerCase();
        const isInvalidCredentials =
            err.code === 401 ||
            err.status === 401 ||
            (normalizedMessage.includes("invalid credentials") ||
                normalizedMessage.includes("invalid_grant") ||
                normalizedMessage.includes("unauthorized"));
        const isInsufficientScope =
            err.code === 403 ||
            err.status === 403 ||
            normalizedMessage.includes("insufficient authentication scopes") ||
            normalizedMessage.includes("insufficient scopes");

        if (isInsufficientScope) {
            return [];
        }

        if (isInvalidCredentials && googleAccount.refresh_token) {
            try {
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

                accessToken = refreshedTokens.access_token;
                oauth2Client.setCredentials({ access_token: accessToken });

                const response = await calendar.events.list({
                    calendarId: "primary",
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: "startTime",
                });
                responseData = response.data.items || [];
            } catch {
                return [];
            }
        } else {
            console.error("GCal Sync Error:", error);
        }
    }

    return responseData;
}
