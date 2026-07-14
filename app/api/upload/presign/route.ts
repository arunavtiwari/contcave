import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { r2 } from "@/lib/storage/r2";

const STORAGE_FOLDER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,240}$/;
const ALLOWED_UPLOAD_TYPES = new Map<string, Set<string>>([
    ["image/jpeg", new Set(["jpg", "jpeg"])],
    ["image/png", new Set(["png"])],
    ["image/webp", new Set(["webp"])],
    ["image/avif", new Set(["avif"])],
    ["image/gif", new Set(["gif"])],
    ["video/mp4", new Set(["mp4"])],
    ["video/webm", new Set(["webm"])],
    ["video/quicktime", new Set(["mov"])],
    ["application/pdf", new Set(["pdf"])],
]);
const MAX_UPLOAD_BYTES = new Map<string, number>([
    ["image/jpeg", 15_000_000],
    ["image/png", 15_000_000],
    ["image/webp", 15_000_000],
    ["image/avif", 15_000_000],
    ["image/gif", 15_000_000],
    ["video/mp4", 250_000_000],
    ["video/webm", 250_000_000],
    ["video/quicktime", 250_000_000],
    ["application/pdf", 10_000_000],
]);

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!req.headers.get("content-type")?.includes("application/json")) {
            return new NextResponse("Content-Type must be application/json", { status: 415 });
        }
        const uploadLimit = rateLimit({
            key: `upload-presign:${currentUser.id}:${getClientIp(req.headers)}`,
            // A valid listing can contain main, set, add-on, and verification
            // media in one submission. Keep the authenticated presign guard
            // above that schema-defined maximum so valid submissions are not
            // cut off partway through.
            limit: 2_000,
            windowMs: 15 * 60_000,
        });
        if (!uploadLimit.allowed) {
            const response = new NextResponse("Too many upload requests", { status: 429 });
            response.headers.set("Retry-After", formatRetryAfterMs(uploadLimit.resetAt));
            return response;
        }

        const rawBody = await req.text();
        if (rawBody.length > 10_000) {
            return new NextResponse("Request body too large", { status: 413 });
        }
        let body: Record<string, unknown>;
        try {
            body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
            return new NextResponse("Invalid JSON", { status: 400 });
        }
        const { filename, contentType, fileSize, folder = "uploads" } = body;
        if (!filename || !contentType || fileSize == null) {
            return new NextResponse("Missing filename, contentType, or fileSize", { status: 400 });
        }
        if (
            typeof filename !== "string" ||
            typeof contentType !== "string" ||
            typeof fileSize !== "number" ||
            !Number.isSafeInteger(fileSize) ||
            fileSize <= 0 ||
            typeof folder !== "string" ||
            filename.length > 255 ||
            filename.includes("/") ||
            filename.includes("\\") ||
            !STORAGE_FOLDER_PATTERN.test(folder) ||
            folder.includes("..") ||
            folder.startsWith("/") ||
            folder.endsWith("/")
        ) {
            return new NextResponse("Invalid upload path", { status: 400 });
        }

        const ext = filename.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "";
        const allowedExtensions = ALLOWED_UPLOAD_TYPES.get(contentType.toLowerCase());
        if (!allowedExtensions?.has(ext)) {
            return new NextResponse("Unsupported file type", { status: 400 });
        }
        const maxBytes = MAX_UPLOAD_BYTES.get(contentType.toLowerCase());
        if (!maxBytes || fileSize > maxBytes) {
            return new NextResponse("File exceeds the upload size limit", { status: 413 });
        }
        const uniqueName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
        const baseFolder = `users/${currentUser.id}/${folder}`;
        const key = `${baseFolder}/${uniqueName}`;
        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
        const publicBaseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL?.replace(/\/$/, "");
        if (!bucket || !publicBaseUrl) {
            return new NextResponse("Storage is not configured", { status: 500 });
        }

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType.toLowerCase(),
            ContentLength: fileSize,
            CacheControl: "public, max-age=31536000, immutable",
        });

        const url = await getSignedUrl(r2, command, { expiresIn: 600 });
        const publicUrl = `${publicBaseUrl}/${key}`;

        return NextResponse.json({ url, publicUrl, key });
    } catch (error: unknown) {
        console.error("[PRESIGN_ERROR]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
