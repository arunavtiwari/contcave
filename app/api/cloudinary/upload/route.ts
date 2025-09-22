import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(request: Request) {
    try {
        const { dataUrl, folder = "agreements", publicId } = await request.json();
        const cloud = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!cloud || !apiKey || !apiSecret) {
            return NextResponse.json({ error: "Missing Cloudinary env" }, { status: 500 });
        }

        // Expect a data URL like data:application/pdf;base64,...
        const dataUrlStr = String(dataUrl || "");
        const mime = dataUrlStr.match(/^data:(.*?);base64,/)?.[1] || "application/pdf";
        const isPdf = /pdf/i.test(mime);
        const resourceType = isPdf ? "raw" : "image";

        // Cloudinary accepts data URLs directly in 'file'
        const form = new FormData();
        form.append("file", dataUrlStr);
        form.append("folder", folder);
        const timestamp = String(Math.floor(Date.now() / 1000));
        form.append("timestamp", timestamp);
        if (publicId) form.append("public_id", publicId);

        // Sign params
        const params: Record<string, string> = { folder, timestamp };
        if (publicId) params.public_id = publicId;
        const toSign = Object.keys(params)
            .sort()
            .map((k) => `${k}=${params[k]}`)
            .join("&");
        const signature = crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");

        form.append("api_key", apiKey);
        form.append("signature", signature);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resourceType}/upload`, {
            method: "POST",
            body: form,
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Upload error" }, { status: 500 });
    }
}


