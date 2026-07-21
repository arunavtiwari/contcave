import { inflateSync } from "node:zlib";

import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import AgreementDocument from "@/components/pdfs/AgreementDocument";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { getClientIp } from "@/lib/http/requestMeta";
import prisma from "@/lib/prismadb";
import { formatRetryAfterMs, rateLimit } from "@/lib/security/rateLimit";
import { uploadPrivateDocument } from "@/lib/storage/privateDocuments";
import { formatISTDate } from "@/lib/utils";
import { UserRole } from "@/types/user";

export const runtime = "nodejs";

const SIGNATURE_MAX_BYTES = 1_000_000;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

class SignatureImageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SignatureImageError";
    }
}

function validatePng(buffer: Buffer) {
    if (buffer.length < 33 || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
        throw new SignatureImageError("Signature image must be a valid PNG or JPEG file");
    }

    const idatChunks: Buffer[] = [];
    let offset = PNG_SIGNATURE.length;
    let hasIend = false;

    while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
        const dataStart = offset + 8;
        const dataEnd = dataStart + length;
        const nextOffset = dataEnd + 4;

        if (dataEnd > buffer.length || nextOffset > buffer.length) {
            throw new SignatureImageError("Signature PNG is incomplete or corrupted");
        }

        if (type === "IDAT") {
            idatChunks.push(buffer.subarray(dataStart, dataEnd));
        }

        if (type === "IEND") {
            hasIend = true;
            break;
        }

        offset = nextOffset;
    }

    if (!hasIend || idatChunks.length === 0) {
        throw new SignatureImageError("Signature PNG is incomplete or corrupted");
    }

    try {
        inflateSync(Buffer.concat(idatChunks), { maxOutputLength: 4_000_000 });
    } catch {
        throw new SignatureImageError("Signature PNG is corrupted. Please upload a valid PNG or JPEG signature");
    }
}

function validateJpeg(buffer: Buffer) {
    const startsWithSoi = buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8;
    const endsWithEoi = buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;

    if (!startsWithSoi || !endsWithEoi) {
        throw new SignatureImageError("Signature image must be a valid PNG or JPEG file");
    }
}

function normalizeSignatureDataUrl(value: unknown) {
    if (typeof value !== "string") {
        throw new SignatureImageError("Signature image is required");
    }

    const match = value.match(/^data:(image\/png|image\/jpe?g);base64,([a-zA-Z0-9+/=\s]+)$/);
    if (!match) {
        throw new SignatureImageError("Signature image must be a PNG or JPEG data URL");
    }

    const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
    const buffer = Buffer.from(match[2].replace(/\s/g, ""), "base64");

    if (buffer.length === 0 || buffer.length > SIGNATURE_MAX_BYTES) {
        throw new SignatureImageError("Signature image must be 1 MB or smaller");
    }

    if (mimeType === "image/png") {
        validatePng(buffer);
    } else {
        validateJpeg(buffer);
    }

    return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }
        if (currentUser.role !== UserRole.OWNER && currentUser.role !== UserRole.ADMIN) {
            return createErrorResponse("Only owners and administrators can generate listing agreements", 403);
        }
        const generationLimit = rateLimit({
            key: `agreement-pdf:${currentUser.id}:${getClientIp(request.headers)}`,
            limit: 20,
            windowMs: 15 * 60_000,
        });
        if (!generationLimit.allowed) {
            const response = createErrorResponse("Too many agreement generation requests", 429);
            response.headers.set("Retry-After", formatRetryAfterMs(generationLimit.resetAt));
            return response;
        }

        const parsedBody = await readJsonObject(request, 1_500_000);
        if (!parsedBody.success) return parsedBody.response;
        const body = parsedBody.data;
        const { listingId, signatureUrl } = body;

        if (typeof listingId !== "string" || typeof signatureUrl !== "string") {
            return createErrorResponse("Missing listingId or signatureUrl", 400);
        }

        let signatureDataUrl: string;
        try {
            signatureDataUrl = normalizeSignatureDataUrl(signatureUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : "Invalid signature image";
            return createErrorResponse(message, 400);
        }

        const isObjectId = /^[0-9a-fA-F]{24}$/.test(listingId);

        const listing = isObjectId
            ? await prisma.listing.findUnique({
                where: { id: listingId },
                select: { id: true, userId: true, archivedAt: true },
            })
            : await prisma.listing.findUnique({
                where: { slug: listingId },
                select: { id: true, userId: true, archivedAt: true },
            });
        if ((listing && (listing.userId !== currentUser.id || listing.archivedAt)) || (!listing && !isObjectId)) {
            return createErrorResponse("Listing not found", 404);
        }
        const actualListingId = listing?.id || listingId;

        const dateStr = formatISTDate(new Date());

        const buffer = await renderToBuffer(
            React.createElement(AgreementDocument as React.ElementType, {
                signatureUrl: signatureDataUrl,
                dateStr,
            }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
        );

        const folder = `users/${currentUser.id}/listings/${actualListingId}/compliance/agreements`;
        const timestamp = Math.floor(Date.now() / 1000);
        const publicId = `agreement-${timestamp}`;
        const key = `${folder}/${publicId}/signed.pdf`;

        try {
            const storageRef = await uploadPrivateDocument({
                key,
                body: buffer as Buffer,
                contentType: "application/pdf",
            });
            return createSuccessResponse({
                storageRef,
                public_id: key,
            });
        } catch (error) {
            console.error("R2 agreement upload error:", error);
            throw new Error("R2 upload failed");
        }
    } catch (error) {
        return handleRouteError(error, "POST /api/agreements/generate");
    }
}
