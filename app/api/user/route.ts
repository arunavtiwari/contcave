import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createKnownErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { normalizePhone } from "@/lib/phone";
import { UserService } from "@/lib/user/service";
import { phoneUpdateSchema, userUpdateSchema } from "@/schemas/user";

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return createErrorResponse("Unauthorized", 401);
    }

    const parsedBody = await readJsonObject(request, 25_000);
    if (!parsedBody.success) return parsedBody.response;

    const validation = userUpdateSchema.safeParse(parsedBody.data);
    if (!validation.success) {
      return createErrorResponse(validation.error.issues[0].message, 400);
    }
    const updatedUser = await UserService.updateProfile(currentUser.email, validation.data);
    return createSuccessResponse(updatedUser);
  } catch (error) {
    const knownResponse = createKnownErrorResponse(error);
    if (knownResponse) return knownResponse;
    return handleRouteError(error, "PUT /api/user");
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return createErrorResponse("Unauthorized", 401);

    const parsedBody = await readJsonObject(request, 5_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;

    const phone = body?.phone;
    if (typeof phone !== "string") {
      return createErrorResponse("phone must be a string", 400);
    }

    const normalized = normalizePhone(phone);
    if (!normalized) {
      return createErrorResponse("Enter a valid 10-digit mobile number", 400);
    }


    const validation = phoneUpdateSchema.safeParse({ phone: normalized });
    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(firstError.message, 400);
    }

    if (!currentUser.email) return createErrorResponse("Email not found", 400);
    const updated = await UserService.updateProfile(currentUser.email, { phone: normalized });
    return createSuccessResponse({ ok: true, phone: updated.phone });
  } catch (error) {
    const knownResponse = createKnownErrorResponse(error);
    if (knownResponse) return knownResponse;
    return handleRouteError(error, "PATCH /api/user");
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.email) {
      return createErrorResponse("Unauthorized", 401);
    }

    await UserService.deleteProfile(currentUser.email);

    return createSuccessResponse({ ok: true });
  } catch (error) {
    const knownResponse = createKnownErrorResponse(error);
    if (knownResponse) return knownResponse;
    return handleRouteError(error, "DELETE /api/user");
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "PUT, PATCH, DELETE, OPTIONS"
    }
  });
}

export const dynamic = "force-dynamic";
