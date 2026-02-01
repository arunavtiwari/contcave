import { google } from 'googleapis';

import { auth } from "@/auth";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

async function refreshCalendarAccessToken(account: { refresh_token: string }): Promise<{ access_token: string; expires_in?: number; refresh_token?: string }> {
  try {
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

    let refreshedTokens: unknown;
    const responseText = await response.text();
    try {
      refreshedTokens = JSON.parse(responseText);
    } catch (_jsonError) {
      throw new Error(`Failed to parse token refresh response: ${responseText.substring(0, 200)}`);
    }

    if (!response.ok) {
      const errorMessage = typeof refreshedTokens === 'object' && refreshedTokens !== null && 'error' in refreshedTokens
        ? String(refreshedTokens.error)
        : 'Unknown error';
      throw new Error(`Failed to refresh token: ${errorMessage}`);
    }

    if (
      typeof refreshedTokens !== 'object' ||
      refreshedTokens === null ||
      !('access_token' in refreshedTokens) ||
      typeof refreshedTokens.access_token !== 'string'
    ) {
      throw new Error('Invalid token refresh response: missing access_token');
    }

    return refreshedTokens as { access_token: string; expires_in?: number; refresh_token?: string };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error during token refresh');
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get('listingId');

    let accessToken: string | null = null;
    let googleAccount: { id: string; refresh_token: string | null; access_token: string | null; provider: string } | null = null;

    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId },
        include: { user: { include: { accounts: true } } },
      });
      if (!listing || !listing.user) {
        return createErrorResponse("Listing or owner not found", 400);
      }
      googleAccount = (listing.user.accounts.find(
        (account) => account.provider === 'google-calendar'
      ) || null) as { id: string; refresh_token: string | null; access_token: string | null; provider: string } | null;
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
    } catch (error: unknown) {

      const err = error as { code?: number; status?: number; message?: string };
      const isInvalidCredentials =
        (err.code === 401 || err.status === 401) ||
        (err.message &&
          (err.message.toLowerCase().includes("invalid credentials") ||
            err.message.toLowerCase().includes("invalid authentication credentials") ||
            err.message.includes("invalid_grant") ||
            err.message.toLowerCase().includes("unauthorized")));

      if (isInvalidCredentials && googleAccount && googleAccount.refresh_token) {
        try {
          const refreshedTokens = await refreshCalendarAccessToken({
            refresh_token: googleAccount.refresh_token
          });

          if (!refreshedTokens.access_token) {
            throw new Error('Token refresh did not return access_token');
          }


          await prisma.account.update({
            where: { id: googleAccount.id },
            data: {
              access_token: refreshedTokens.access_token,
              expires_at: refreshedTokens.expires_in
                ? Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
                : null,
            },
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
        } catch (refreshError) {

          const errorMessage = refreshError instanceof Error
            ? refreshError.message
            : 'Unknown error during token refresh';
          throw new Error(`Failed to refresh calendar access token: ${errorMessage}. Original error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
      } else {

        throw error;
      }
    }
    return createSuccessResponse(responseData);
  } catch (error) {
    return handleRouteError(error, "GET /api/calendar/events");
  }
}
