import { google } from 'googleapis';
import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function DELETE(request: NextRequest) {
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
    const { id, calendarId } = body;

    if (!id || typeof id !== "string" || id.trim().length === 0) {
      return createErrorResponse("Event id is required and must be a non-empty string", 400);
    }

    if (calendarId && (typeof calendarId !== "string" || calendarId.trim().length === 0)) {
      return createErrorResponse("calendarId must be a non-empty string if provided", 400);
    }

    const effectiveCalendarId = (calendarId?.trim() || 'primary').slice(0, 200);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return createErrorResponse("Server configuration error", 500);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      await calendar.events.delete({
        calendarId: effectiveCalendarId,
        eventId: id.trim(),
      });

      clearTimeout(timeoutId);
      return createSuccessResponse({
        success: true,
        message: 'Event deleted successfully from Google Calendar'
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return createErrorResponse("Request timeout", 408);
      }
      throw fetchError;
    }
  } catch (error) {
    return handleRouteError(error, "DELETE /api/calendar/delete-event");
  }
}
