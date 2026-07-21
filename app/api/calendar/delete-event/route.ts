import { google } from 'googleapis';
import { NextRequest } from "next/server";

import { auth } from "@/auth";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getGoogleCalendarCredentialForUser, isGoogleCalendarAuthError, refreshGoogleCalendarAccessToken } from "@/lib/calendar/oauth";

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const credential = await getGoogleCalendarCredentialForUser(session.user.id);
    if (!credential) {
      return createErrorResponse("Google Calendar is not connected", 400);
    }

    const parsedBody = await readJsonObject(request, 10_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const { id, calendarId } = body;

    if (!id || typeof id !== "string" || id.trim().length === 0 || id.trim().length > 1024) {
      return createErrorResponse("Event id is required and must be a non-empty string", 400);
    }

    if (calendarId && (typeof calendarId !== "string" || calendarId.trim().length === 0)) {
      return createErrorResponse("calendarId must be a non-empty string if provided", 400);
    }

    const effectiveCalendarId = (
      typeof calendarId === "string" && calendarId.trim() ? calendarId.trim() : "primary"
    ).slice(0, 200);

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return createErrorResponse("Server configuration error", 500);
    }

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
      const deleteEvent = () => calendar.events.delete({
        calendarId: effectiveCalendarId,
        eventId: id.trim(),
      }, { signal: controller.signal });

      try {
        await deleteEvent();
      } catch (error) {
        if (!credential.refreshToken || !isGoogleCalendarAuthError(error)) throw error;
        const refreshed = await refreshGoogleCalendarAccessToken(credential.accountId, credential.refreshToken);
        oauth2Client.setCredentials({ access_token: refreshed.access_token, refresh_token: refreshed.refresh_token });
        await deleteEvent();
      }

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
