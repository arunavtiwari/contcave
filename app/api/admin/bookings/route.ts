import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createOfflineBooking } from "@/lib/admin/offlineBooking";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { isAdmin } from "@/lib/user/permissions";
import { createAdminOfflineBookingSchema } from "@/schemas/offlineBooking";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isAdmin(currentUser.role)) {
      return createErrorResponse("Unauthorized. Admin privileges required.", 403);
    }

    const jsonResult = await readJsonObject(request);
    if (!jsonResult.success) {
      return jsonResult.response;
    }

    const validation = createAdminOfflineBookingSchema.safeParse(jsonResult.data);
    if (!validation.success) {
      return createErrorResponse(
        validation.error.issues[0]?.message || "Invalid booking data",
        400,
        { issues: validation.error.issues }
      );
    }

    const result = await createOfflineBooking(validation.data, currentUser);

    revalidatePath("/admin/dashboard/bookings");
    revalidatePath("/dashboard/bookings");

    return createSuccessResponse(result, 201, "Offline booking created successfully");
  } catch (error) {
    return handleRouteError(error, "POST /api/admin/bookings");
  }
}
