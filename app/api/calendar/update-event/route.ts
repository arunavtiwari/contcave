import { auth } from "@/auth";
import { google } from 'googleapis';
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { NextRequest } from "next/server";

function validateDateTime(dateTime: string, isAllDay: boolean): boolean {
  if (isAllDay) {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateTime);
  }
  try {
    const date = new Date(dateTime);
    return !isNaN(date.getTime()) && dateTime.includes('T');
  } catch {
    return false;
  }
}

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
    const { id, title, start, end } = body;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return createErrorResponse("id is required and must be a non-empty string", 400);
    }

    if (!title || typeof title !== "string") {
      return createErrorResponse("title is required and must be a string", 400);
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return createErrorResponse("title cannot be empty", 400);
    }
    if (trimmedTitle.length > 500) {
      return createErrorResponse("title is too long (max 500 characters)", 400);
    }

    if (!start || typeof start !== "string") {
      return createErrorResponse("start is required and must be a string", 400);
    }

    if (!end || typeof end !== "string") {
      return createErrorResponse("end is required and must be a string", 400);
    }

    const isAllDay = !start.includes('T') && !end.includes('T');

    if (!validateDateTime(start, isAllDay)) {
      return createErrorResponse(`Invalid start date/time format. ${isAllDay ? "Expected YYYY-MM-DD" : "Expected ISO 8601 datetime"}`, 400);
    }

    if (!validateDateTime(end, isAllDay)) {
      return createErrorResponse(`Invalid end date/time format. ${isAllDay ? "Expected YYYY-MM-DD" : "Expected ISO 8601 datetime"}`, 400);
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (endDate <= startDate) {
      return createErrorResponse("end date/time must be after start date/time", 400);
    }

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
