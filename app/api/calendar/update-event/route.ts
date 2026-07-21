import { google } from 'googleapis';
import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getGoogleCalendarCredentialForUser, isGoogleCalendarAuthError, refreshGoogleCalendarAccessToken } from "@/lib/calendar/oauth";

function isValidCalendarDateValue(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  return value.includes("T") && Number.isFinite(new Date(value).getTime());
}

const updateEventSchema = z.object({
  id: z.string().min(1, "Event ID is required").max(1024, "Event ID is too long"),
  title: z.string().trim().min(1, "Title is required").max(500, "Title is too long (max 500 characters)"),
  start: z.string().trim().min(1, "Start date/time is required").refine(
    isValidCalendarDateValue,
    "Start date/time is invalid",
  ),
  end: z.string().trim().min(1, "End date/time is required").refine(
    isValidCalendarDateValue,
    "End date/time is invalid",
  ),
}).refine((data) => data.start.includes("T") === data.end.includes("T"), {
  message: "Start and end must both be all-day dates or both be date-times",
  path: ["end"],
}).refine((data) => {
  const startDate = new Date(data.start);
  const endDate = new Date(data.end);
  return endDate > startDate;
}, {
  message: "End date/time must be after start date/time",
  path: ["end"],
});

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const credential = await getGoogleCalendarCredentialForUser(session.user.id);
    if (!credential) {
      return createErrorResponse("Google Calendar is not connected", 400);
    }

    const parsedBody = await readJsonObject(request, 20_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;


    const validation = updateEventSchema.safeParse(body);
    if (!validation.success) {
      return createErrorResponse(validation.error.issues[0].message, 400);
    }

    const { id, title, start, end } = validation.data;
    const trimmedTitle = title.trim();
    const isAllDay = !start.includes('T') && !end.includes('T');

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return createErrorResponse("Server configuration error", 500);
    }

    const event = {
      summary: trimmedTitle,
      start: isAllDay
        ? { date: start.trim() }
        : { dateTime: start.trim(), timeZone: 'UTC' },
      end: isAllDay
        ? { date: end.trim() }
        : { dateTime: end.trim(), timeZone: 'UTC' },
    };

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: credential.accessToken,
      refresh_token: credential.refreshToken || undefined,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const updateEvent = () => calendar.events.update({
        calendarId: 'primary',
        eventId: id.trim(),
        requestBody: event,
      }, { signal: controller.signal });

      let response;
      try {
        response = await updateEvent();
      } catch (error) {
        if (!credential.refreshToken || !isGoogleCalendarAuthError(error)) throw error;
        const refreshed = await refreshGoogleCalendarAccessToken(credential.accountId, credential.refreshToken);
        oauth2Client.setCredentials({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token });
        response = await updateEvent();
      }

      clearTimeout(timeoutId);
      return createSuccessResponse(response.data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return createErrorResponse("Request timeout", 408);
      }
      throw fetchError;
    }
  } catch (error) {
    return handleRouteError(error, "PUT /api/calendar/update-event");
  }
}
