import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import AgreementDocument from "@/components/pdfs/AgreementDocument";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

export async function POST(request: Request) {
    try {
        const currentUser = await getCurrentUser();

        if (!currentUser?.id) {
            return createErrorResponse("Unauthorized", 401);
        }

        const body = await request.json();
        const { listingId, signatureUrl } = body;

        if (!listingId || !signatureUrl) {
            return createErrorResponse("Missing listingId or signatureUrl", 400);
        }

        // Resolve slug → actual Mongo ObjectId
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(listingId);

        let actualListingId = listingId;

        if (!isObjectId) {
            const listing = await prisma.listing.findUnique({
                where: { slug: listingId },
                select: { id: true },
            });

            if (!listing) {
                return createErrorResponse("Listing not found", 404);
            }

            actualListingId = listing.id;
        }

        // 1. Generate PDF Buffer
        const dateStr = new Date().toLocaleDateString("en-IN", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });

        const buffer = await renderToBuffer(
            React.createElement(AgreementDocument as React.ElementType, {
                signatureUrl,
                dateStr,
            }) as React.ReactElement<import("@react-pdf/renderer").DocumentProps>
        );

        // 2. Prepare R2 Upload
        const folder = `users/${currentUser.id}/listings/${actualListingId}/agreements`;
        const timestamp = Math.floor(Date.now() / 1000);
        const publicId = `agreement-${timestamp}`;
        const key = `${folder}/${publicId}.pdf`;

        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME;
        if (!bucket) throw new Error("Missing R2 bucket config");

        const { PutObjectCommand } = await import("@aws-sdk/client-s3");
        const { r2 } = await import("@/lib/storage/r2");

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer as Buffer,
            ContentType: "application/pdf"
        });

        try {
            await r2.send(command);
        } catch (error) {
            console.error("R2 agreement upload error:", error);
            throw new Error("R2 upload failed");
        }

        const secureUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}/${key}`;

        return createSuccessResponse({
            url: secureUrl,
            pdfUrl: secureUrl,
            public_id: publicId,
        });
    } catch (error) {
        return handleRouteError(error, "POST /api/agreements/generate");
    }
}