import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { google } from 'googleapis';
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prismadb";

async function refreshCalendarAccessToken(account: any) {
  const url = "https://oauth2.googleapis.com/token";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const refreshedTokens = await response.json();
  if (!response.ok) {
    throw new Error("Failed to refresh token: " + JSON.stringify(refreshedTokens));
  }
  return refreshedTokens;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    let accessToken: string | null = null;
    let googleAccount: any = null;

    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { user: { include: { accounts: true } } },
      });
      if (!listing || !listing.user) {
        return NextResponse.json({ error: "Listing or owner not found" }, { status: 400 });
      }
      googleAccount = listing.user.accounts.find(
        (account) => account.provider === 'google-calendar'
      );
      if (!googleAccount || !googleAccount.access_token) {
        return NextResponse.json(
          { error: "Listing owner hasn't connected their Google Calendar" },
          { status: 400 }
        );
      }
      accessToken = googleAccount.access_token;
    } else {
      const session = await getServerSession(authOptions);
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (!session.calendarAccessToken) {
        return NextResponse.json(
          { error: 'Session calendar access token missing' },
          { status: 401 }
        );
      }
      accessToken = session.calendarAccessToken;
    }

    if (!accessToken) {
      return NextResponse.json({ error: "Access token not available" }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: accessToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 2);

    let responseData;
    try {
      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      responseData = response.data.items || [];
    } catch (error: any) {
      if (
        error.message &&
        error.message.includes("Invalid Credentials") &&
        googleAccount &&
        googleAccount.refresh_token
      ) {
        const refreshedTokens = await refreshCalendarAccessToken(googleAccount);
        await prisma.account.update({
          where: { id: googleAccount.id },
          data: { access_token: refreshedTokens.access_token },
        });
        accessToken = refreshedTokens.access_token;
        oauth2Client.setCredentials({ access_token: accessToken });
        const response = await calendar.events.list({
          calendarId: 'primary',
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });
        responseData = response.data.items || [];
      } else {
        throw error;
      }
    }
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Error in GET /api/google-calendar:", error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events', details: error.message },
      { status: 500 }
    );
  }
}
