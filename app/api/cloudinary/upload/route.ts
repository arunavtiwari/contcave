import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(parts[1] || "");
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
}

export async function POST(request: Request) {
    try {
        const { dataUrl, folder = "agreements", publicId } = await request.json();
        const cloud = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        if (!cloud || !apiKey || !apiSecret) {
            return NextResponse.json({ error: "Missing Cloudinary env" }, { status: 500 });
        }

        const form = new FormData();
        const blob = await dataUrlToBlob(String(dataUrl));
        form.append("file", blob, (publicId || `agreement_${Date.now()}`) + ".png");
        form.append("folder", folder);
        const timestamp = String(Math.floor(Date.now() / 1000));
        form.append("timestamp", timestamp);
        // request eager PDF generation
        form.append("eager", "f_pdf");

        // Signature: sign 'folder=...&timestamp=...' (and public_id if provided)
        const params: Record<string, string> = { folder, timestamp, eager: "f_pdf" };
        if (publicId) params.public_id = publicId;
        const toSign = Object.keys(params)
            .sort()
            .map((k) => `${k}=${params[k]}`)
            .join("&");
        const signature = await crypto.subtle.digest(
            "SHA-1",
            new TextEncoder().encode(toSign + apiSecret)
        ).then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""));

        form.append("api_key", apiKey);
        form.append("signature", signature);
        if (publicId) form.append("public_id", publicId);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
            method: "POST",
            body: form,
        });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data }, { status: 500 });
        const pdf_url = Array.isArray(data?.eager) && data.eager[0]?.secure_url
            ? data.eager[0].secure_url
            : (typeof data?.secure_url === "string"
                ? String(data.secure_url).replace("/upload/", "/upload/f_pdf/").replace(/\.[^/.]+$/, ".pdf")
                : undefined);
        return NextResponse.json({ ...data, pdf_url });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Upload error" }, { status: 500 });
    }
}


