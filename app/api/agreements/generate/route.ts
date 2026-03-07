import { renderToBuffer } from "@react-pdf/renderer";
import crypto from "crypto";
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

        // 2. Prepare Cloudinary Upload
        const folder = `agreements/${actualListingId}`;
        const timestamp = Math.floor(Date.now() / 1000);
        const publicId = `agreement-${timestamp}`;

        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        const apiKey =
            process.env.CLOUDINARY_API_KEY ||
            process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        const cloudName =
            process.env.CLOUDINARY_CLOUD_NAME ||
            process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

        if (!apiSecret || !apiKey || !cloudName) {
            return createErrorResponse(
                "Server configuration error: Cloudinary credentials missing",
                500
            );
        }

        // 3. Generate Cloudinary Signature
        const paramsToSign = {
            folder,
            timestamp,
            public_id: publicId,
        };

        const toSign = Object.entries(paramsToSign)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join("&");

        const signature = crypto
            .createHash("sha1")
            .update(`${toSign}${apiSecret}`)
            .digest("hex");

        // 4. Upload to Cloudinary
        const formData = new FormData();

        const pdfBlob = new Blob([buffer as BlobPart], {
            type: "application/pdf",
        });

        formData.append("file", pdfBlob, `${publicId}.pdf`);
        formData.append("folder", folder);
        formData.append("timestamp", String(timestamp));
        formData.append("public_id", publicId);
        formData.append("api_key", apiKey);
        formData.append("signature", signature);

        const uploadRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
                method: "POST",
                body: formData,
            }
        );

        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData?.secure_url) {
            throw new Error(uploadData?.error?.message || "Cloudinary upload failed");
        }

        return createSuccessResponse({
            url: uploadData.secure_url,
            pdfUrl: uploadData.secure_url,
            public_id: uploadData.public_id,
        });
    } catch (error) {
        return handleRouteError(error, "POST /api/agreements/generate");
    }
}