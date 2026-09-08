"use server";

import { google } from "googleapis";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getGoogleClientCredentials, isGoogleCalendarAuthError, refreshGoogleCalendarAccessToken } from "@/lib/calendar/oauth";
import prisma from "@/lib/prismadb";

function isObjectId(value: string) {
    return /^[0-9a-fA-F]{24}$/.test(value);
}

function toOwnerCalendarEvents(events: Array<{
    id?: string | null;
    summary?: string | null;
    description?: string | null;
    start?: { date?: string | null; dateTime?: string | null } | null;
    end?: { date?: string | null; dateTime?: string | null } | null;
}>) {
    return events.flatMap((event) => {
        if (!event.id || (!event.start?.date && !event.start?.dateTime)) return [];
        return [{
            id: event.id,
            summary: event.summary || undefined,
            description: event.description || undefined,
            start: {
                ...(event.start?.date ? { date: event.start.date } : {}),
                ...(event.start?.dateTime ? { dateTime: event.start.dateTime } : {}),
            },
            end: {
                ...(event.end?.date ? { date: event.end.date } : {}),
                ...(event.end?.dateTime ? { dateTime: event.end.dateTime } : {}),
            },
        }];
    });
}

/**
 * Fetch calendar events for a listing
 */
export async function getCalendarEventsAction(listingId?: string) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser?.id) return [];

        let accessToken: string | null = null;
        let googleAccount: {
            id: string;
            refresh_token: string | null;
            access_token: string | null;
            provider: string;
        } | null | undefined = null;

        if (listingId) {
            const normalizedListingId = listingId.trim();
            if (!normalizedListingId || normalizedListingId.length > 200) return [];
            let listing;
            if (isObjectId(normalizedListingId)) {
                listing = await prisma.listing.findUnique({
                    where: { id: normalizedListingId },
                    select: { userId: true, user: { select: { accounts: { select: {
                        id: true, refresh_token: true, access_token: true, provider: true,
                    } } } } },
                });
            } else {
                listing = await prisma.listing.findUnique({
                    where: { slug: normalizedListingId },
                    select: { userId: true, user: { select: { accounts: { select: {
                        id: true, refresh_token: true, access_token: true, provider: true,
                    } } } } },
                });
            }

            if (!listing || listing.userId !== currentUser.id) return [];

            const owner = listing.user;
            googleAccount = owner.accounts.find(
                (account) => account.provider === "google-calendar"
            );

            if (!googleAccount || (!googleAccount.access_token && !googleAccount.refresh_token)) return [];

            accessToken = googleAccount.access_token;
        } else {
            googleAccount = await prisma.account.findFirst({
                where: { userId: currentUser.id, provider: "google-calendar" },
                select: {
                    id: true,
                    refresh_token: true,
                    access_token: true,
                    provider: true,
                },
            });
            if (!googleAccount || (!googleAccount.access_token && !googleAccount.refresh_token)) return [];
            accessToken = googleAccount.access_token;
        }

        if (!googleAccount) return [];
        if (!accessToken && googleAccount.refresh_token) {
            accessToken = (await refreshGoogleCalendarAccessToken(googleAccount.id, googleAccount.refresh_token)).access_token;
        }
        if (!accessToken) return [];
        const { clientId, clientSecret } = getGoogleClientCredentials();

        const oauth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret
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

            return toOwnerCalendarEvents(response.data.items || []);
        } catch (error: unknown) {
            const isInvalidCredentials = isGoogleCalendarAuthError(error);

            if (isInvalidCredentials && googleAccount && googleAccount.refresh_token) {
                const refreshedTokens = await refreshGoogleCalendarAccessToken(googleAccount.id, googleAccount.refresh_token);

                oauth2Client.setCredentials({ access_token: refreshedTokens.access_token });
                const retryResponse = await calendar.events.list({
                    calendarId: "primary",
                    timeMin: timeMin.toISOString(),
                    timeMax: timeMax.toISOString(),
                    singleEvents: true,
                    orderBy: "startTime",
                });
                return toOwnerCalendarEvents(retryResponse.data.items || []);
            }
            throw error;
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.error('[getCalendarEventsAction] Error:', error.message);
        } else {
            console.error('[getCalendarEventsAction] Unknown Error:', error);
        }
        return [];
    }
}

