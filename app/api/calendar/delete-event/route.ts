import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { google } from 'googleapis';

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: 'No access token found' }, { status: 401 });
    }

    const body = await request.json();
    const { id, calendarId } = body;
    if (!id) {
      return NextResponse.json({ error: 'Event id is required' }, { status: 400 });
    }

    const effectiveCalendarId = calendarId || 'primary';

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: effectiveCalendarId,
      eventId: id,
    });

    return NextResponse.json(
      { success: true, message: 'Event deleted successfully from Google Calendar' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting google event using googleapis:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
