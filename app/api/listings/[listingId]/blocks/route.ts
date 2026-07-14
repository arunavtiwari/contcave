import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { listingBlockSchema } from "@/schemas/listing";

export const runtime = "nodejs";

interface IParams {
    listingId?: string;
}

function serializeBlock<T extends { date: Date; createdAt: Date }>(block: T) {
    return {
        ...block,
        date: block.date.toISOString(),
        createdAt: block.createdAt.toISOString(),
    };
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
    try {
        const { listingId } = await props.params;
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return createErrorResponse("Authentication required", 401);
        }

        if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
            return createErrorResponse("Invalid listing ID", 400);
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { id: true, userId: true },
        });

        if (!listing || (listing.userId !== currentUser.id && currentUser.role !== "ADMIN")) {
            return createErrorResponse("Listing not found", 404);
        }

        const blocks = await prisma.listingBlock.findMany({
            where: { listingId },
            orderBy: [{ date: "asc" }, { startTime: "asc" }],
        });

        return createSuccessResponse(blocks.map(serializeBlock));
    } catch (error) {
        return handleRouteError(error, "GET /api/listings/[listingId]/blocks");
    }
}

export async function POST(request: Request, props: { params: Promise<IParams> }) {
    try {
        const { listingId } = await props.params;
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return createErrorResponse("Authentication required", 401);
        }

        if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
            return createErrorResponse("Invalid listing ID", 400);
        }

        const listing = await prisma.listing.findUnique({
            where: { id: listingId },
            select: { userId: true, sets: { select: { id: true } } },
        });

        if (!listing) {
            return createErrorResponse("Listing not found", 404);
        }

        if (listing.userId !== currentUser.id && currentUser.role !== "ADMIN") {
            return createErrorResponse("You don't have permission to manage blocks for this listing", 403);
        }

        const parsedBody = await readJsonObject(request, 25_000);
        if (!parsedBody.success) return parsedBody.response;
        const validation = listingBlockSchema.safeParse({ ...parsedBody.data, listingId });
        if (!validation.success) {
            return createErrorResponse(validation.error.issues[0].message, 400);
        }
        const { date, startTime, endTime, setIds, reason } = validation.data;
        const validSetIds = new Set(listing.sets.map((set) => set.id));
        if (setIds.some((setId) => !validSetIds.has(setId))) {
            return createErrorResponse("One or more sets do not belong to this listing", 400);
        }

        const block = await prisma.listingBlock.create({
            data: {
                listingId,
                date: new Date(`${date}T00:00:00.000Z`),
                startTime,
                endTime,
                setIds,
                reason: reason?.trim() || null,
            },
        });

        return createSuccessResponse(serializeBlock(block), 201, "Block created successfully");
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

        if (!listingId || !/^[a-f\d]{24}$/i.test(listingId)) {
            return createErrorResponse("Invalid listing ID", 400);
        }

        const url = new URL(request.url);
        const blockId = url.searchParams.get("blockId");

        if (!blockId || !/^[a-f\d]{24}$/i.test(blockId)) {
            return createErrorResponse("blockId query parameter is required", 400);
        }

        const block = await prisma.listingBlock.findUnique({
            where: { id: blockId },
            include: { listing: { select: { userId: true } } },
        });

        if (!block) {
            return createErrorResponse("Block not found", 404);
        }

        if (block.listing.userId !== currentUser.id && currentUser.role !== "ADMIN") {
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
