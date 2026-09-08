import { calendar_v3, google } from "googleapis";

import prisma from "@/lib/prismadb";

import { getGoogleClientCredentials, isGoogleCalendarAuthError, refreshGoogleCalendarAccessToken } from "./oauth";

type PublicCalendarBusyEvent = {
    start: { date?: string; dateTime?: string };
    end: { date?: string; dateTime?: string };
};

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
                    accounts: {
                        where: { provider: "google-calendar" },
                        select: { id: true, provider: true, access_token: true, refresh_token: true },
                    },
                },
            },
        },
    });

    if (!listing || !listing.user) return [];
    if (!listing.user.googleCalendarConnected) return [];

    const googleAccount = listing.user.accounts.find(
        (a) => a.provider === "google-calendar"
    );

    if (!googleAccount || (!googleAccount.access_token && !googleAccount.refresh_token)) return [];

    const { clientId, clientSecret } = getGoogleClientCredentials();
    let accessToken = googleAccount.access_token;
    if (!accessToken && googleAccount.refresh_token) {
        accessToken = (await refreshGoogleCalendarAccessToken(googleAccount.id, googleAccount.refresh_token)).access_token;
    }
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 91);

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
        const isInvalidCredentials = isGoogleCalendarAuthError(error);
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
                const refreshedTokens = await refreshGoogleCalendarAccessToken(googleAccount.id, googleAccount.refresh_token);

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

    return responseData
        .map((event): PublicCalendarBusyEvent | null => {
            const startDate = typeof event.start?.date === "string" ? event.start.date : null;
            const startDateTime = typeof event.start?.dateTime === "string" ? event.start.dateTime : null;
            const endDate = typeof event.end?.date === "string" ? event.end.date : null;
            const endDateTime = typeof event.end?.dateTime === "string" ? event.end.dateTime : null;

            if ((!startDate && !startDateTime) || (!endDate && !endDateTime)) return null;

            return {
                start: {
                    ...(startDate ? { date: startDate } : {}),
                    ...(startDateTime ? { dateTime: startDateTime } : {}),
                },
                end: {
                    ...(endDate ? { date: endDate } : {}),
                    ...(endDateTime ? { dateTime: endDateTime } : {}),
                },
            };
        })
        .filter((event): event is PublicCalendarBusyEvent => event !== null);
}
