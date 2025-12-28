import { auth } from "@/auth";
import { google } from 'googleapis';
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.accessToken) {
      return createErrorResponse("Unauthorized", 401);
    }

    const { id, title, start, end } = await request.json();

    if (!id || !title || !start || !end) {
      return createErrorResponse("Missing required fields: id, title, start, or end", 400);
    }

    const isAllDay = !start.includes('T') && !end.includes('T');

    const event = {
      summary: title,
      start: isAllDay
        ? { date: start }
        : { dateTime: start, timeZone: 'UTC' },
      end: isAllDay
        ? { date: end }
        : { dateTime: end, timeZone: 'UTC' },
    };

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: session.accessToken as string,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: id,
      requestBody: event,
    });

    return createSuccessResponse(response.data);
  } catch (error) {
    return handleRouteError(error, "PUT /api/calendar/update-event");
  }
}
