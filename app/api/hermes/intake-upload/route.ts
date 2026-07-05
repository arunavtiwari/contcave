import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { r2 } from "@/lib/storage/r2";

/**
 * Moodboard upload presign for the public brief intake form.
 * Brands are unauthenticated — a valid intakeToken authorises the upload
 * (the session-authed presign route at /api/upload/presign stays untouched).
 */

const ALLOWED_CONTENT_TYPES = /^image\/(jpeg|png|webp)$/;

export async function POST(req: NextRequest) {
    try {
        const { intakeToken, contentType } = await req.json();
        if (typeof intakeToken !== "string" || typeof contentType !== "string") {
            return createErrorResponse("Missing intakeToken or contentType", 400);
        }
        if (!ALLOWED_CONTENT_TYPES.test(contentType)) {
            return createErrorResponse("Only JPEG/PNG/WebP images are allowed", 400);
        }

        const brand = await prisma.clientBrand.findUnique({
            where: { intakeToken },
            select: { id: true },
        });
        if (!brand) return createErrorResponse("Invalid intake link", 403);

        const ext = contentType.split("/")[1].replace("jpeg", "jpg");
        const key = `hermes/moodboards/${brand.id}/${crypto.randomBytes(16).toString("hex")}.${ext}`;
        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            CacheControl: "public, max-age=31536000, immutable",
        });
        const url = await getSignedUrl(r2, command, { expiresIn: 600 });
        const publicUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}/${key}`;

        return createSuccessResponse({ url, publicUrl, key });
    } catch (error) {
        return handleRouteError(error, "POST /api/hermes/intake-upload");
    }
}
