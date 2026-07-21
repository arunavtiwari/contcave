import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { isE2eEffectDisabled } from "@/lib/e2e-guards";
import { getClientIp } from "@/lib/http/requestMeta";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { getPrivateDocumentBucket, toPrivateDocumentRef } from "@/lib/storage/privateDocuments";
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

export async function PUT(req: NextRequest) {
    // Browser E2E exercises the same presign/upload contract without writing
    // documents to a shared bucket. This flag is unavailable in production.
    if (!isE2eEffectDisabled("E2E_DISABLE_R2_UPLOAD")) {
        return new NextResponse("Not Found", { status: 404 });
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) return new NextResponse("Unauthorized", { status: 401 });

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > 250_000_000) {
        return new NextResponse("Invalid upload size", { status: 413 });
    }

    return new NextResponse(null, { status: 204 });
}

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
        if (new TextEncoder().encode(rawBody).byteLength > 10_000) {
            return new NextResponse("Request body too large", { status: 413 });
        }
        let body: Record<string, unknown>;
        try {
            body = JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
            return new NextResponse("Invalid JSON", { status: 400 });
        }
        const { filename, contentType, fileSize, folder = "uploads", access = "public" } = body;
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
            (access !== "public" && access !== "private") ||
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
        const isPrivate = access === "private";
        if (isPrivate && (contentType.toLowerCase() !== "application/pdf" || !/^listings\/[a-f\d]{24}\/compliance(?:\/|$)/i.test(folder))) {
            return new NextResponse("Private uploads are limited to listing compliance PDFs", { status: 400 });
        }
        const cacheControl = isPrivate ? "private, no-store" : "public, max-age=31536000, immutable";
        if (isE2eEffectDisabled("E2E_DISABLE_R2_UPLOAD")) {
            return NextResponse.json({
                // PUT is handled above and deliberately does not persist data.
                url: new URL("/api/upload/presign", req.url).toString(),
                publicUrl: isPrivate ? undefined : `https://assets.contcave.com/e2e/${key}`,
                objectRef: isPrivate ? toPrivateDocumentRef(key) : undefined,
                key,
                cacheControl,
            });
        }

        const bucket = isPrivate ? getPrivateDocumentBucket() : process.env.CLOUDFLARE_R2_BUCKET_NAME;
        const publicBaseUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL?.replace(/\/$/, "");
        if (!bucket || (!isPrivate && !publicBaseUrl)) {
            return new NextResponse("Storage is not configured", { status: 500 });
        }

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType.toLowerCase(),
            ContentLength: fileSize,
            CacheControl: cacheControl,
        });

        const url = await getSignedUrl(r2, command, { expiresIn: 600 });
        const publicUrl = isPrivate ? undefined : `${publicBaseUrl}/${key}`;

        return NextResponse.json({
            url,
            publicUrl,
            objectRef: isPrivate ? toPrivateDocumentRef(key) : undefined,
            key,
            cacheControl,
        });
    } catch (error: unknown) {
        console.error("[PRESIGN_ERROR]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
