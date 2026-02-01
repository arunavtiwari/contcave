import { google } from 'googleapis';
import { NextRequest } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";


// Schema for calendar event update
const updateEventSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  title: z.string().min(1, "Title is required").max(500, "Title is too long (max 500 characters)"),
  start: z.string().min(1, "Start date/time is required"),
  end: z.string().min(1, "End date/time is required"),
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
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const accessToken = (session as { accessToken?: string }).accessToken;
    if (!accessToken || typeof accessToken !== "string") {
      return createErrorResponse("No access token found", 401);
    }

    const body = await request.json().catch(() => ({}));

    // Validate with Zod
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
      access_token: accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await calendar.events.update({
        calendarId: 'primary',
        eventId: id.trim(),
        requestBody: event,
      });

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
