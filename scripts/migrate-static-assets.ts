/* eslint-disable no-console */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
const publicUrlBase = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || "";

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function migrateAsset(url: string, key: string) {
    console.log(`[ASSET] Migrating ${url} -> ${key}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || "video/mp4";

    await r2.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    }));

    console.log(`[ASSET] Success: ${publicUrlBase}/${key}`);
}

async function run() {
    try {
        await migrateAsset("https://res.cloudinary.com/duqay465q/video/upload/v1775847837/download_wbbmxk.mp4", "static/hero-bg.mp4");
        // Static Banners
        const bannerUrl = `${publicUrlBase}/assets/banner.jpg`;
        await migrateAsset(bannerUrl, "static/banner.jpg");

        console.log("\nStatic assets migrated successfully!");
        console.log("Please update Hero.tsx src to use the new URL.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

run();
