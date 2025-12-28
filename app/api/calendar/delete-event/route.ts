import { auth } from "@/auth";
import { google } from 'googleapis';
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return createErrorResponse("Unauthorized", 401);
    }

    const accessToken = (session as { accessToken?: string }).accessToken;
    if (!accessToken) {
      return createErrorResponse("No access token found", 401);
    }

    const body = await request.json();
    const { id, calendarId } = body;
    if (!id) {
      return createErrorResponse("Event id is required", 400);
    }

    const effectiveCalendarId = calendarId || 'primary';

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: effectiveCalendarId,
      eventId: id,
    });

    return createSuccessResponse({
      success: true,
      message: 'Event deleted successfully from Google Calendar'
    });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/calendar/delete-event");
  }
}
