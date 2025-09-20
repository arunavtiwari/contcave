import { NextResponse } from "next/server";
import crypto from "crypto";

// Signs Cloudinary upload params for signed uploads
// We must sign ALL params Cloudinary includes, excluding: file, api_key, cloud_name, resource_type, signature
// Typical params: timestamp, folder, upload_preset, public_id, eager, transformation, source, context, tags
export async function POST(request: Request) {
    try {
        const raw = await request.json().catch(() => ({} as any));
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!apiSecret) {
            return NextResponse.json({ error: "Missing CLOUDINARY_API_SECRET" }, { status: 500 });
        }

        // next-cloudinary may send { paramsToSign: {...} }
        const paramsObj: Record<string, any> = raw?.paramsToSign && typeof raw.paramsToSign === "object"
            ? raw.paramsToSign
            : raw || {};

        // Ensure timestamp exists (in seconds)
        const nowTs = String(Math.floor(Date.now() / 1000));
        if (!paramsObj.timestamp) paramsObj.timestamp = nowTs;

        // Whitelist of signable keys that commonly appear
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

        return NextResponse.json({ signature, timestamp: String(paramsObj.timestamp) });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Signature error" }, { status: 500 });
    }
}


