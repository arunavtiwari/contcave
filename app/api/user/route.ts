import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { normalizePhone } from "@/lib/phone";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await request.json();
    const { name, description, location, languages, title, email, phone, profileImage, is_owner, is_verified } = body;

    if (
      typeof name !== "string" ||
      typeof description !== "string" ||
      typeof location !== "string" ||
      !Array.isArray(languages) ||
      !languages.every((lang) => typeof lang === "string") ||
      typeof title !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof is_owner !== "boolean" ||
      typeof is_verified !== "boolean"
    ) {
      return createErrorResponse("Invalid input", 400);
    }

    const updatedUser = await prisma.user.update({
      where: { email: currentUser?.email ?? "" },
      data: { name, description, location, languages, title, email, phone, profileImage, is_owner, is_verified },
    });
    return createSuccessResponse(updatedUser);
  } catch (error) {
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
