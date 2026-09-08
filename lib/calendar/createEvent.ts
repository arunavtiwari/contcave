import { google } from "googleapis";

import prisma from "@/lib/prismadb";

import { getGoogleClientCredentials, isGoogleCalendarAuthError, refreshGoogleCalendarAccessToken } from "./oauth";

type GoogleCalendarEvent = {
    summary?: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
};

type CalendarListItem = {
    summary?: string | null;
    start?: { dateTime?: string | null; date?: string | null };
    end?: { dateTime?: string | null; date?: string | null };
    [key: string]: unknown;
};

export async function createCalendarEventForUser(params: {
    userId: string;
    title: string;
    startIso: string;
    endIso: string;
}) {
    if (!params?.userId || !params?.title || !params?.startIso || !params?.endIso) {
        throw new Error("Missing required parameters: userId, title, startIso, endIso");
    }

    const { clientId, clientSecret } = getGoogleClientCredentials();

    const acct = await prisma.account.findFirst({
        where: { userId: params.userId, provider: "google-calendar" },
        select: { id: true, refresh_token: true, access_token: true },
    });
    if (!acct || (!acct.refresh_token && !acct.access_token)) return null;

    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret
    );
    oauth2Client.setCredentials({
        access_token: acct.access_token || undefined,
        refresh_token: acct.refresh_token || undefined,
    });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const isAllDay = !params.startIso.includes("T") && !params.endIso.includes("T");
    const event: GoogleCalendarEvent = {
        summary: params.title,
        start: isAllDay ? { date: params.startIso } : { dateTime: params.startIso, timeZone: "UTC" },
        end: isAllDay ? { date: params.endIso } : { dateTime: params.endIso, timeZone: "UTC" },
    };

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const attemptInsert = async () => {
        const res = await calendar.events.insert({ calendarId: "primary", requestBody: event });
        return res.data;
    };

    try {
        return await attemptInsert();
    } catch (err: unknown) {
        const isAuthError = isGoogleCalendarAuthError(err);
        if (isAuthError && acct.refresh_token) {
            const refreshed = await refreshGoogleCalendarAccessToken(acct.id, acct.refresh_token);
            oauth2Client.setCredentials({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token });

            try {
                return await attemptInsert();
            } catch (e2: unknown) {
                err = e2;
            }
        }

        const retryCandidate = err as { code?: unknown; status?: unknown; message?: unknown };
        const retryStatus = Number(retryCandidate.code || retryCandidate.status || 0);
        const retryMessage = typeof retryCandidate.message === "string" ? retryCandidate.message : "";
        const retryable = retryStatus === 0 || retryStatus === 429 || (retryStatus >= 500 && retryStatus < 600) || /rate limit|quota|backend error/i.test(retryMessage);
        if (retryable) {
            const maxAttempts = 3;
            for (let i = 1; i <= maxAttempts; i++) {
                await sleep(250 * Math.pow(2, i));
                try {
                    return await attemptInsert();
                } catch (e3: unknown) {
                    if (i === maxAttempts) throw e3;
                }
            }
        }
        throw err;
    }
}

function toIsoMs(s: string): string {
    const d = new Date(s);
    return new Date(d.getTime()).toISOString();
}

export async function ensureCalendarEventForUser(params: {
    userId: string;
    title: string;
    startIso: string;
    endIso: string;
}) {
    if (!params?.userId) throw new Error("Missing userId");

    const acct = await prisma.account.findFirst({
        where: { userId: params.userId, provider: "google-calendar" },
        select: { id: true, refresh_token: true, access_token: true },
    });
    if (!acct || (!acct.refresh_token && !acct.access_token)) return null;

    const { clientId, clientSecret } = getGoogleClientCredentials();
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
        access_token: acct.access_token || undefined,
        refresh_token: acct.refresh_token || undefined,
    });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });


    const timeMin = toIsoMs(params.startIso);
    const timeMax = toIsoMs(params.endIso);
    const listMatchingEvents = () => calendar.events.list({
            calendarId: "primary",
            timeMin,
            timeMax,
            singleEvents: true,
            q: params.title,
            orderBy: "startTime",
        });
    try {
        let listed;
        try {
            listed = await listMatchingEvents();
        } catch (error) {
            if (!acct.refresh_token || !isGoogleCalendarAuthError(error)) throw error;
            const refreshed = await refreshGoogleCalendarAccessToken(acct.id, acct.refresh_token);
            oauth2Client.setCredentials({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token });
            listed = await listMatchingEvents();
        }
        const items = listed.data.items || [];
        const existingEvent = items.find((ev) => {
            const evItem = ev as CalendarListItem;
            const evStart = evItem?.start?.dateTime || evItem?.start?.date || "";
            const evEnd = evItem?.end?.dateTime || evItem?.end?.date || "";
            return String(evItem.summary || "").trim() === params.title.trim() &&
                (evStart.startsWith(params.startIso) || params.startIso.startsWith(evStart)) &&
                (evEnd.startsWith(params.endIso) || params.endIso.startsWith(evEnd));
        });
        if (existingEvent) return existingEvent;
    } catch (error) {
        throw new Error("Unable to verify the Google Calendar event", { cause: error });
    }

    return await createCalendarEventForUser(params);
}
