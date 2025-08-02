import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { google } from 'googleapis';

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, title, start, end } = await request.json();

  if (!id || !title || !start || !end) {
    return NextResponse.json(
      { error: 'Missing required fields: id, title, start, or end' },
      { status: 400 }
    );
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

  try {
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

    return NextResponse.json(response.data, { status: 200 });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
