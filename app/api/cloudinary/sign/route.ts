import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
    try {
        const raw = await request.json().catch(() => ({} as any));
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!apiSecret) {
            return NextResponse.json({ error: "Missing CLOUDINARY_API_SECRET" }, { status: 500 });
        }

        const paramsObj: Record<string, any> = raw?.paramsToSign && typeof raw.paramsToSign === "object"
            ? raw.paramsToSign
            : raw || {};

        const nowTs = String(Math.floor(Date.now() / 1000));
        if (!paramsObj.timestamp) paramsObj.timestamp = nowTs;

        const allowedKeys = new Set([
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
        Object.keys(paramsObj).forEach((k) => {
            const v = paramsObj[k];
            if (v == null) return;
            if (allowedKeys.has(k)) {
                signParams[k] = typeof v === "string" ? v : JSON.stringify(v);
            }
        });

        const toSign = Object.keys(signParams)
            .sort()
            .map((k) => `${k}=${signParams[k]}`)
            .join("&");

        const signature = crypto.createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");

        const apiKey = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
        const cloud = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
        return NextResponse.json({ signature, timestamp: String(paramsObj.timestamp), apiKey, cloud });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Signature error" }, { status: 500 });
    }
}


