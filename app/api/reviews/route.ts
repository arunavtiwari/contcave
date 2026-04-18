import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { ReviewService } from "@/lib/review/service";

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const body = await request.json().catch(() => ({}));

    try {
      const review = await ReviewService.createReview(currentUser.id, body);
      return createSuccessResponse(review, 201, "Review created successfully");
    } catch (e: unknown) {
      return createErrorResponse(e instanceof Error ? e.message : "Unknown error", 400);
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/reviews");
  }
}
