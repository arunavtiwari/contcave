import { google } from "googleapis";

import prisma from "@/lib/prismadb";

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

async function refreshAccessToken(refreshToken: string) {
    const url = "https://oauth2.googleapis.com/token";
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID || "",
            client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: refreshToken,
        }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error("Failed to refresh token: " + JSON.stringify(data));
    }
    return data as { access_token: string; expires_in?: number; scope?: string; token_type?: string };
}

export async function createCalendarEventForUser(params: {
    userId: string;
    title: string;
    startIso: string;
    endIso: string;
}) {
    if (!params?.userId || !params?.title || !params?.startIso || !params?.endIso) {
        throw new Error("Missing required parameters: userId, title, startIso, endIso");
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error("Server configuration error: missing Google client credentials");
    }

    const acct = await prisma.account.findFirst({
        where: { userId: params.userId, provider: "google-calendar" },
        select: { id: true, refresh_token: true, access_token: true },
    });
    if (!acct || (!acct.refresh_token && !acct.access_token)) return null;

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || "",
        process.env.GOOGLE_CLIENT_SECRET || ""
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
        const msg = err instanceof Error ? err.message : "";
        const errorWithCode = err as { code?: unknown; status?: unknown; message?: string };
        const status = Number(errorWithCode.code || errorWithCode.status || 0);
        const isAuthError = msg.includes("Invalid Credentials") || status === 401;
        if (isAuthError && acct.refresh_token) {
            const refreshed = await refreshAccessToken(acct.refresh_token);
            await prisma.account.update({ where: { id: acct.id }, data: { access_token: refreshed.access_token } });
            oauth2Client.setCredentials({ access_token: refreshed.access_token, refresh_token: acct.refresh_token });

            try {
                return await attemptInsert();
            } catch (e2: unknown) {

                err = e2;
            }
        }

        const retryable = status === 0 || status === 429 || (status >= 500 && status < 600) || /rate limit|quota|backend error/i.test(msg);
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

    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || "",
        process.env.GOOGLE_CLIENT_SECRET || ""
    );
    oauth2Client.setCredentials({
        access_token: acct.access_token || undefined,
        refresh_token: acct.refresh_token || undefined,
    });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });


    const timeMin = toIsoMs(params.startIso);
    const timeMax = toIsoMs(params.endIso);
    try {
        const listed = await calendar.events.list({
            calendarId: "primary",
            timeMin,
            timeMax,
            singleEvents: true,
            q: params.title,
            orderBy: "startTime",
        });
        const items = listed.data.items || [];
        const exists = items.some((ev) => {
            const evItem = ev as CalendarListItem;
            const evStart = evItem?.start?.dateTime || evItem?.start?.date || "";
            const evEnd = evItem?.end?.dateTime || evItem?.end?.date || "";
            return String(evItem.summary || "").trim() === params.title.trim() &&
                (evStart.startsWith(params.startIso) || params.startIso.startsWith(evStart)) &&
                (evEnd.startsWith(params.endIso) || params.endIso.startsWith(evEnd));
        });
        if (exists) return items[0];
    } catch {

    }

    return await createCalendarEventForUser(params);
}
