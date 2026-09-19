import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import prisma from "@/lib/prismadb";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { enqueueMediaDeletions } from "@/lib/storage/mediaDeletionQueue";

export const runtime = "nodejs";

const MAX_REFS = 200;
const MAX_REF_LENGTH = 2_000;

// Queues uploads whose owner abandoned the form they belong to. Refs outside
// the caller's own prefix are dropped on enqueue, and the drain re-checks every
// ref against saved records before anything is removed from storage.
export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) return createErrorResponse("Unauthorized", 401);

        const limit = rateLimit({
            key: `upload-cleanup:${currentUser.id}:${getClientIp(req.headers)}`,
            limit: 60,
            windowMs: 15 * 60_000,
        });
        if (!limit.allowed) {
            const response = createErrorResponse("Too many cleanup requests", 429);
            response.headers.set("Retry-After", formatRetryAfterMs(limit.resetAt));
            return response;
        }

        const body = await readJsonObject(req, 100_000);
        if (!body.success) return body.response;

        const rawRefs = body.data.refs;
        if (!Array.isArray(rawRefs)) return createErrorResponse("refs must be an array", 400);
        if (rawRefs.length > MAX_REFS) return createErrorResponse("Too many references", 413);

        const refs = rawRefs.filter((ref): ref is string =>
            typeof ref === "string" && ref.length > 0 && ref.length <= MAX_REF_LENGTH);

        const queued = await enqueueMediaDeletions(prisma, {
            refs,
            ownerId: currentUser.id,
            reason: "upload-abandoned",
        });

        return createSuccessResponse({ queued });
    } catch (error) {
        return handleRouteError(error, "POST /api/upload/cleanup");
    }
}
