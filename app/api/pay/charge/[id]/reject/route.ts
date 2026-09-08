import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import { PostBookingService } from "@/lib/post-booking/service";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, props: Props) {
  try {
    const { id } = await props.params;
    const token = req.nextUrl.searchParams.get("token") || "";
    if (!/^[a-f\d]{24}$/i.test(id) || !/^[A-Za-z0-9_-]{32,100}$/.test(token)) {
      return createErrorResponse("Invalid payment link", 400);
    }
    const limit = rateLimit({
      key: `reject-charge:${getClientIp(req.headers)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!limit.allowed) {
      const response = createErrorResponse("Too many requests", 429);
      response.headers.set("Retry-After", formatRetryAfterMs(limit.resetAt));
      return response;
    }
    await PostBookingService.rejectAdditionalChargeByToken(id, token);
    return createSuccessResponse({ ok: true });
  } catch (error) {
    return handleRouteError(error, "POST /api/pay/charge/[id]/reject");
  }
}
