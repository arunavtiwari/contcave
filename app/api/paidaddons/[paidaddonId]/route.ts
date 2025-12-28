import prisma from "@/lib/prismadb";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface IParams {
  paidaddonId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  try {
    const params = await props.params;
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    if (!currentUser.is_owner) {
      return createErrorResponse("Only owners can delete addons", 403);
    }

    const { paidaddonId } = params;

    if (!paidaddonId || typeof paidaddonId !== "string" || paidaddonId.trim().length === 0) {
      return createErrorResponse("Invalid addon ID", 400);
    }

    const addon = await prisma.addons.findUnique({
      where: { id: paidaddonId },
      select: { id: true },
    });

    if (!addon) {
      return createErrorResponse("Addon not found", 404);
    }

    await prisma.addons.delete({
      where: {
        id: paidaddonId,
      },
    });

    return createSuccessResponse({ id: paidaddonId, deleted: true }, 200, "Addon deleted successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return createErrorResponse("Addon not found", 404);
    }
    return handleRouteError(error, "DELETE /api/paidaddons/[paidaddonId]");
  }
}
