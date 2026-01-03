import crypto from "crypto";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

interface SignatureParams {
    timestamp?: string;
    folder?: string;
    public_id?: string;
    eager?: string;
    transformation?: string;
    context?: string;
    tags?: string;
    upload_preset?: string;
    source?: string;
    type?: string;
    invalidate?: string;
}

export async function POST(request: Request) {
    try {
        if (!request.headers.get("content-type")?.includes("application/json")) {
            return createErrorResponse("Content-Type must be application/json", 415);
        }

        const currentUser = await getCurrentUser();
        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const raw = await request.json().catch(() => ({}));
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!apiSecret || typeof apiSecret !== "string") {
            return createErrorResponse("Server configuration error", 500);
        }

        const paramsObj: SignatureParams = raw?.paramsToSign && typeof raw.paramsToSign === "object"
            ? raw.paramsToSign
            : raw || {};

        const nowTs = String(Math.floor(Date.now() / 1000));
        if (!paramsObj.timestamp) paramsObj.timestamp = nowTs;

        const allowedKeys: Set<keyof SignatureParams> = new Set([
            "timestamp",
            "folder",
            "public_id",
            "eager",
            "transformation",
            "context",
            "tags",
            "upload_preset",
            "source",
            "type",
            "invalidate",
        ]);

        const signParams: Record<string, string> = {};

        for (const key of Object.keys(paramsObj) as Array<keyof SignatureParams>) {
            const value = paramsObj[key];
            if (value != null && allowedKeys.has(key)) {
                const stringValue = typeof value === "string" ? value : JSON.stringify(value);
                if (stringValue.length > 1000) {
                    return createErrorResponse(`Parameter ${key} value is too long (max 1000 characters)`, 400);
                }
                signParams[key] = stringValue;
            }
        }

        const toSign = Object.keys(signParams)
            .sort()
            .map((k) => `${k}=${signParams[k]}`)
            .join("&");

        const signature = crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");

        const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        if (!apiKey || !cloud) {
            return createErrorResponse("Server configuration error", 500);
        }

        return createSuccessResponse({
            signature,
            timestamp: String(paramsObj.timestamp),
            apiKey,
            cloud
        });
    } catch (error) {
        return handleRouteError(error, "POST /api/cloudinary/sign");
    }
}
