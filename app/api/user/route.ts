import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prismadb";

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
    const updateData: Record<string, unknown> = {};

    if ("name" in body) {
      if (typeof body.name !== "string") {
        return createErrorResponse("name must be a string", 400);
      }
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2) {
        return createErrorResponse("name must be at least 2 characters long", 400);
      }
      if (trimmedName.length > 100) {
        return createErrorResponse("name is too long (max 100 characters)", 400);
      }
      updateData.name = trimmedName;
    }

    if ("description" in body) {
      if (typeof body.description !== "string") {
        return createErrorResponse("description must be a string", 400);
      }
      const trimmedDesc = body.description.trim();
      if (trimmedDesc.length > 1000) {
        return createErrorResponse("description is too long (max 1000 characters)", 400);
      }
      updateData.description = trimmedDesc || null;
    }

    if ("location" in body) {
      if (typeof body.location !== "string") {
        return createErrorResponse("location must be a string", 400);
      }
      const trimmedLocation = body.location.trim();
      if (trimmedLocation.length > 200) {
        return createErrorResponse("location is too long (max 200 characters)", 400);
      }
      updateData.location = trimmedLocation || null;
    }

    if ("languages" in body) {
      if (!Array.isArray(body.languages)) {
        return createErrorResponse("languages must be an array", 400);
      }
      if (body.languages.length > 10) {
        return createErrorResponse("languages array cannot exceed 10 items", 400);
      }
      if (!body.languages.every((lang: unknown) => typeof lang === "string" && lang.trim().length > 0 && lang.trim().length <= 50)) {
        return createErrorResponse("All languages must be non-empty strings (max 50 characters)", 400);
      }
      updateData.languages = body.languages.map((lang: string) => lang.trim());
    }

    if ("title" in body) {
      if (typeof body.title !== "string") {
        return createErrorResponse("title must be a string", 400);
      }
      const trimmedTitle = body.title.trim();
      if (trimmedTitle.length > 100) {
        return createErrorResponse("title is too long (max 100 characters)", 400);
      }
      updateData.title = trimmedTitle || null;
    }

    if ("profileImage" in body) {
      if (typeof body.profileImage !== "string" && body.profileImage !== null) {
        return createErrorResponse("profileImage must be a string or null", 400);
      }
      if (body.profileImage && body.profileImage.length > 500) {
        return createErrorResponse("profileImage URL is too long", 400);
      }
      updateData.profileImage = body.profileImage || null;
    }

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
