import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createKnownErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { ReviewService } from "@/lib/review/service";
import { createReviewSchema } from "@/schemas/review";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    const parsedBody = await readJsonObject(request, 10_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const parsed = createReviewSchema.safeParse(body);
    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message || "Invalid review details", 400);
    }

    try {
      const review = await ReviewService.createReview(currentUser.id, parsed.data);
      return createSuccessResponse(review, 201, "Review created successfully");
    } catch (e: unknown) {
      const knownResponse = createKnownErrorResponse(e);
      if (knownResponse) return knownResponse;
      throw e;
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/reviews");
  }
}
