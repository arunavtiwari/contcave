import { google } from "googleapis";
import prisma from "@/lib/prismadb";

export async function createCalendarEventForUser(params: {
    userId: string;
    title: string;
    startIso: string;
    endIso: string;
}) {
    const acct = await prisma.account.findFirst({
        where: { userId: params.userId, provider: "google-calendar" },
        select: { refresh_token: true, access_token: true },
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
    const event = {
        summary: params.title,
        start: isAllDay ? { date: params.startIso } : { dateTime: params.startIso, timeZone: "UTC" },
        end: isAllDay ? { date: params.endIso } : { dateTime: params.endIso, timeZone: "UTC" },
    } as any;
    const res = await calendar.events.insert({ calendarId: "primary", requestBody: event });
    return res.data;
}


