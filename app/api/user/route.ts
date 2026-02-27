import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prismadb";
import { phoneUpdateSchema,userUpdateSchema } from "@/lib/schemas/user";

export async function PUT(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id || !currentUser?.email) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json().catch(() => ({}));
    console.log("BODY", body);


    const validation = userUpdateSchema.safeParse(body);
    console.log(validation.error?.issues);

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(firstError.message, 400);
    }

    const validData = validation.data;


    const updateData: Record<string, unknown> = {};
    Object.entries(validData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    if (Object.keys(updateData).length === 0) {
      return createErrorResponse("No valid fields to update", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { email: currentUser.email },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        description: true,
        location: true,
        languages: true,
        title: true,
        profileImage: true,
        phone: true,
        is_owner: true,
        is_verified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createSuccessResponse(updatedUser);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("User not found", 404);
    }
    return handleRouteError(error, "PUT /api/user");
  }
}

export async function PATCH(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return createErrorResponse("Unauthorized", 401);

    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse("Invalid JSON", 400);
    }

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

    const updated = await prisma.user.update({
      where: { email: currentUser?.email ?? "" },
      data: { phone: normalized },
      select: { id: true, phone: true },
    });
    return createSuccessResponse({ ok: true, phone: updated.phone });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/user");
  }
}

export async function DELETE() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.email) {
      return createErrorResponse("Unauthorized", 401);
    }

    await prisma.user.update({
      where: { email: currentUser.email },
      data: {
        markedForDeletion: true,
        markedForDeletionAt: new Date(),
      },
    });

    return createSuccessResponse({ ok: true });
  } catch (error) {
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
