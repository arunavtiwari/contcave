import { NextRequest } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { dispatchMediaDeletion, normalizeMediaRefs } from "@/lib/storage/mediaDeletion";

export const runtime = "nodejs";

const MAX_REFS = 200;
const MAX_REF_LENGTH = 2_000;

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

        const validRefs = normalizeMediaRefs(refs, currentUser.id);
        if (validRefs.length > 0) {
            void dispatchMediaDeletion({
                refs: validRefs,
                ownerId: currentUser.id,
            });
        }

        return createSuccessResponse({ queued: validRefs.length });
    } catch (error) {
        return handleRouteError(error, "POST /api/upload/cleanup");
    }
}
