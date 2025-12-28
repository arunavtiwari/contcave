import { auth } from "@/auth";
import { google } from 'googleapis';
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

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
        return createErrorResponse("Listing or owner not found", 400);
      }
      googleAccount = listing.user.accounts.find(
        (account: any) => account.provider === 'google-calendar'
      );
      if (!googleAccount || !googleAccount.access_token) {
        return createErrorResponse("Listing owner hasn't connected their Google Calendar", 400);
      }
      accessToken = googleAccount.access_token;
    } else {
      const session = await auth();
      if (!session) {
        return createErrorResponse("Unauthorized", 401);
      }
      if (!session.calendarAccessToken) {
        return createErrorResponse("Session calendar access token missing", 401);
      }
      accessToken = session.calendarAccessToken;
    }

    if (!accessToken) {
      return createErrorResponse("Access token not available", 400);
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return createErrorResponse("Server configuration error", 500);
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
    return createSuccessResponse(responseData);
  } catch (error) {
    return handleRouteError(error, "GET /api/calendar/events");
  }
}
