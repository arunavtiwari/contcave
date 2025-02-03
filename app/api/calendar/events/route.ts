import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { authOptions } from '@/lib/auth';

export async function GET() {
  // Get the session using NextAuth
  const session = await getServerSession(authOptions);
  console.log('Session:', session);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ensure required environment variables are available
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error('Google client credentials are missing.');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Initialize OAuth2 client with credentials
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    // Set the access token using the session data
    if (!session.accessToken) {
      console.error('Access token is missing from the session.');
      return NextResponse.json(
        { error: 'Session access token missing' },
        { status: 401 }
      );
    }

    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    // Set up the Google Calendar API client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Define the time range for the calendar events
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1); // 1 month in the past
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 2); // 2 months in the future

    // Fetch the list of events from the user's primary calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Return the events as JSON
    return NextResponse.json(response.data.items || []);
  } catch (error: any) {
    console.error('Error fetching calendar events:', error.message || error);

    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: error.message },
      { status: 500 }
    );
  }
}
