import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { ReservationService } from "@/lib/reservation/service";

export const dynamic = "force-dynamic";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("User not authenticated", 401);
    }

    const { listingId } = params;

    if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
      return createErrorResponse("Invalid Listing ID", 400);
    }

    const result = await ReservationService.checkUserBooking(currentUser.id, listingId);
    if (!result) {
      return createSuccessResponse({ canReview: false, message: "No reservations found" });
    }

    return createSuccessResponse({
      message: 'Reservation found',
      canReview: result.canReview,
      latestReservationId: result.id,
      endAt: result.endAt,
      now: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/checkbooking/[listingId]");
  }
}
