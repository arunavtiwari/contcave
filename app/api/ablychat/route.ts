import Ably from "ably";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, handleRouteError } from "@/lib/api-utils";
import { getAuthorizedChatReservation } from "@/lib/chat/reservation";
import { getClientIp, getUserAgent } from "@/lib/http/requestMeta";
import { auditService } from "@/lib/security/audit";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reservationTokenRequestSchema = z.object({
  reservationId: z.string().trim().min(1).max(191),
});

async function getValidatedReservationId(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return reservationTokenRequestSchema.safeParse(body);
  }

  const formData = await request.formData().catch(() => null);
  return reservationTokenRequestSchema.safeParse({
    reservationId: formData?.get("reservationId"),
  });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    const ipAddress = getClientIp(request.headers);
    const userAgent = getUserAgent(request.headers);

    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const validation = await getValidatedReservationId(request);
    if (!validation.success) {
      return createErrorResponse("Invalid reservation ID", 400);
    }

    const { reservationId } = validation.data;
    const rateLimitKey = `ablychat:${currentUser.id}:${ipAddress}`;
    const { allowed, resetAt } = rateLimit({
      key: rateLimitKey,
      limit: 20,
      windowMs: 60_000,
    });

    if (!allowed) {
      void auditService.logSuspiciousActivity(currentUser.id, "Chat token rate limit exceeded", {
        ipAddress,
        reservationId,
        route: "/api/ablychat",
      });

      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "Content-Type": "application/json",
            "Retry-After": formatRetryAfterMs(resetAt),
          },
        }
      );
    }

    const reservation = await getAuthorizedChatReservation(reservationId, currentUser.id);
    if (!reservation) {
      void auditService.logSuspiciousActivity(currentUser.id, "Unauthorized chat token request", {
        ipAddress,
        reservationId,
        route: "/api/ablychat",
      });

      return createErrorResponse("Reservation not found or unauthorized", 404);
    }

    const ablyApiKey = process.env.NEXT_PUBLIC_ABLY_CHAT_API;
    if (!ablyApiKey || typeof ablyApiKey !== "string") {
      return createErrorResponse("Server configuration error", 500);
    }

    const client = new Ably.Rest({ key: ablyApiKey });
    const capability = JSON.stringify({
      [reservationId]: ["publish", "subscribe", "history"],
    });

    const tokenRequest = await client.auth.createTokenRequest({
      capability,
      clientId: currentUser.id,
      ttl: 60 * 60 * 1000,
    });

    void auditService.log({
      action: "CHAT_TOKEN_ISSUED",
      ipAddress,
      metadata: {
        capability,
        route: "/api/ablychat",
      },
      resource: "ReservationChat",
      resourceId: reservationId,
      userAgent,
      userId: currentUser.id,
    });

    return NextResponse.json(tokenRequest, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Vary: "Cookie",
      },
    });

  } catch (error) {
    return handleRouteError(error, "POST /api/ablychat");
  }
}
