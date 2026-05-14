import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { r2 } from "@/lib/storage/r2";

const STORAGE_FOLDER_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9/_-]{0,240}$/;

export async function POST(req: NextRequest) {
    try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();
        const { filename, contentType, folder = "uploads" } = body;
        if (!filename || !contentType) {
            return new NextResponse("Missing filename or contentType", { status: 400 });
        }
        if (
            typeof filename !== "string" ||
            typeof contentType !== "string" ||
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

        const ext = filename.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12) || "bin";
        const uniqueName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
        const baseFolder = `users/${currentUser.id}/${folder}`;
        const key = `${baseFolder}/${uniqueName}`;
        const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
        });

        const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
        const publicUrl = `${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}/${key}`;

        return NextResponse.json({ url, publicUrl, key });
    } catch (error: unknown) {
        console.error("[PRESIGN_ERROR]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
