import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

export const runtime = "nodejs";

interface IParams {
    listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
    try {
        const { listingId } = await props.params;

        if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
            return createErrorResponse("Invalid listing ID", 400);
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { id: true },
        });

        if (!listing) {
            return createErrorResponse("Listing not found", 404);
        }

        const blocks = await prisma.listingBlock.findMany({
            where: { listingId },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
        });

        return createSuccessResponse(blocks);
    } catch (error) {
        return handleRouteError(error, "GET /api/listings/[listingId]/blocks");
    }
}

export async function POST(request: Request, props: { params: Promise<IParams> }) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const { listingId } = await props.params;
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return createErrorResponse("Authentication required", 401);
        }

        if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
            return createErrorResponse("Invalid listing ID", 400);
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true },
        });

        if (!listing) {
            return createErrorResponse("Listing not found", 404);
        }

        if (listing.userId !== currentUser.id) {
            return createErrorResponse("You don't have permission to manage blocks for this listing", 403);
        }

        const body = await request.json().catch(() => ({}));
        const { date, startTime, endTime, setIds, reason } = body;

        if (!date || typeof date !== "string") {
            return createErrorResponse("date is required and must be a string (YYYY-MM-DD)", 400);
        }

        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return createErrorResponse("Invalid date format. Use YYYY-MM-DD", 400);
        }

        if (!startTime || typeof startTime !== "string") {
            return createErrorResponse("startTime is required and must be a string", 400);
        }

        if (!endTime || typeof endTime !== "string") {
            return createErrorResponse("endTime is required and must be a string", 400);
        }

        const sanitizedSetIds = Array.isArray(setIds)
            ? setIds.filter((id: unknown) => typeof id === "string" && id.trim().length > 0)
            : [];

        const sanitizedReason = typeof reason === "string" ? reason.trim().slice(0, 500) : null;

        const block = await prisma.listingBlock.create({
            data: {
                listingId,
                date: parsedDate,
                startTime: startTime.trim(),
                endTime: endTime.trim(),
                setIds: sanitizedSetIds,
                reason: sanitizedReason,
            },
        });

        return createSuccessResponse(block, 201, "Block created successfully");
    } catch (error) {
        return handleRouteError(error, "POST /api/listings/[listingId]/blocks");
    }
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
    try {
        const { listingId } = await props.params;
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return createErrorResponse("Authentication required", 401);
        }

        if (!listingId || typeof listingId !== "string" || listingId.trim().length === 0) {
            return createErrorResponse("Invalid listing ID", 400);
        }

        const url = new URL(request.url);
        const blockId = url.searchParams.get("blockId");

        if (!blockId || typeof blockId !== "string" || blockId.trim().length === 0) {
            return createErrorResponse("blockId query parameter is required", 400);
        }

        const block = await prisma.listingBlock.findUnique({
            where: { id: blockId },
            include: { listing: { select: { userId: true } } },
        });

        if (!block) {
            return createErrorResponse("Block not found", 404);
        }

        if (block.listing.userId !== currentUser.id) {
            return createErrorResponse("You don't have permission to delete this block", 403);
        }

        if (block.listingId !== listingId) {
            return createErrorResponse("Block does not belong to this listing", 400);
        }

        await prisma.listingBlock.delete({
            where: { id: blockId },
        });

        return createSuccessResponse({ id: blockId }, 200, "Block deleted successfully");
    } catch (error) {
        return handleRouteError(error, "DELETE /api/listings/[listingId]/blocks");
    }
}
