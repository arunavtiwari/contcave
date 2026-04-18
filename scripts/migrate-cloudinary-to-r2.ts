/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";

const prisma = new PrismaClient();

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
const publicUrlBase = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || "";

if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrlBase) {
    console.error("Missing R2 Environment Variables");
    process.exit(1);
}

const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

const isCloudinaryUrl = (url?: string | null) => {
    if (!url) return false;
    return typeof url === "string" && url.includes("res.cloudinary.com");
};

const migrateUrl = async (oldUrl: string, folder: string): Promise<string> => {
    if (!isCloudinaryUrl(oldUrl)) return oldUrl;

    try {
        console.log(`[MIGRATE] Downloading ${oldUrl}...`);
        const response = await fetch(oldUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${oldUrl}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get("content-type") || "application/octet-stream";

        const ext = contentType.split("/")[1] || "bin";
        const uniqueName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
        const key = `${folder}/${uniqueName}`;

        console.log(`[MIGRATE] Uploading to R2: ${key}...`);
        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
        });

        await r2.send(command);
        return `${publicUrlBase}/${key}`;
    } catch (error) {
        console.error(`[MIGRATE ERROR] Failed to migrate URL: ${oldUrl}`, error);
        throw error;
    }
}

const migrateStringArray = async (urls: string[], folder: string): Promise<string[]> => {
    const newUrls: string[] = [];
    for (const url of urls) {
        if (isCloudinaryUrl(url)) {
            newUrls.push(await migrateUrl(url, folder));
        } else {
            newUrls.push(url);
        }
    }
    return newUrls;
}

async function migrateUsers() {
    console.log("=== Migrating Users ===");
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { image: { contains: "res.cloudinary.com" } },
                { profileImage: { contains: "res.cloudinary.com" } }
            ]
        }
    });

    for (const user of users) {
        const updates: any = {};
        if (isCloudinaryUrl(user.image)) {
            updates.image = await migrateUrl(user.image!, `users/${user.id}/profiles`);
        }
        if (isCloudinaryUrl(user.profileImage)) {
            updates.profileImage = await migrateUrl(user.profileImage!, `users/${user.id}/profiles`);
        }
        if (Object.keys(updates).length > 0) {
            await prisma.user.update({ where: { id: user.id }, data: updates });
            console.log(`Updated user: ${user.id}`);
        }
    }
}

async function migrateInvoices() {
    console.log("=== Migrating Invoices ===");
    const invoices = await prisma.invoice.findMany({
        where: { invoiceUrl: { contains: "res.cloudinary.com" } }
    });

    for (const invoice of invoices) {
        if (isCloudinaryUrl(invoice.invoiceUrl)) {
            const newUrl = await migrateUrl(invoice.invoiceUrl, `users/${invoice.userId}/invoices/${invoice.id}`);
            await prisma.invoice.update({ where: { id: invoice.id }, data: { invoiceUrl: newUrl } });
            console.log(`Updated invoice: ${invoice.id}`);
        }
    }
}

async function migrateListingSets() {
    console.log("=== Migrating ListingSets ===");
    const sets = await prisma.listingSet.findMany({ include: { listing: true } });
    for (const set of sets) {
        let hasCloudinary = false;
        for (const img of set.images) {
            if (isCloudinaryUrl(img)) hasCloudinary = true;
        }

        if (hasCloudinary) {
            const newImages = await migrateStringArray(set.images, `users/${set.listing.userId}/listings/${set.listingId}/sets/${set.id}`);
            await prisma.listingSet.update({ where: { id: set.id }, data: { images: newImages } });
            console.log(`Updated listing set: ${set.id}`);
        }
    }
}

async function migrateListings() {
    console.log("=== Migrating Listings ===");
    const listings = await prisma.listing.findMany();

    for (const listing of listings) {
        let needsUpdate = false;
        const updates: any = {};

        // 1. imageSrc array
        let hasCloudinaryImageSrc = false;
        for (const img of listing.imageSrc) {
            if (isCloudinaryUrl(img)) hasCloudinaryImageSrc = true;
        }
        if (hasCloudinaryImageSrc) {
            updates.imageSrc = await migrateStringArray(listing.imageSrc, `users/${listing.userId}/listings/${listing.id}/main`);
            needsUpdate = true;
        }

        // 2. Addons JSON
        if (listing.addons && Array.isArray(listing.addons)) {
            let addonsChanged = false;
            const newAddons = [];
            for (const addon of listing.addons as any[]) {
                if (addon.imageUrl && isCloudinaryUrl(addon.imageUrl)) {
                    const newImageUrl = await migrateUrl(addon.imageUrl, `users/${listing.userId}/listings/${listing.id}/addons`);
                    newAddons.push({ ...addon, imageUrl: newImageUrl });
                    addonsChanged = true;
                } else {
                    newAddons.push(addon);
                }
            }
            if (addonsChanged) {
                updates.addons = newAddons;
                needsUpdate = true;
            }
        }

        // 3. Verifications JSON
        if (listing.verifications && typeof listing.verifications === "object" && !Array.isArray(listing.verifications)) {
            let verificationsChanged = false;
            const verificationsCopy: any = { ...listing.verifications };

            // 3a. Agreement PDF
            if (verificationsCopy.agreementPdf && verificationsCopy.agreementPdf.url && isCloudinaryUrl(verificationsCopy.agreementPdf.url)) {
                verificationsCopy.agreementPdf.url = await migrateUrl(verificationsCopy.agreementPdf.url, `users/${listing.userId}/listings/${listing.id}/agreements`);
                verificationsChanged = true;
            }

            // 3b. Documents array
            if (verificationsCopy.documents && Array.isArray(verificationsCopy.documents)) {
                const newDocs = [];
                for (const doc of verificationsCopy.documents) {
                    if (doc.url && isCloudinaryUrl(doc.url)) {
                        const newDocUrl = await migrateUrl(doc.url, `users/${listing.userId}/listings/${listing.id}/verifications`);
                        newDocs.push({ ...doc, url: newDocUrl });
                        verificationsChanged = true;
                    } else {
                        newDocs.push(doc);
                    }
                }
                verificationsCopy.documents = newDocs;
            }

            if (verificationsChanged) {
                updates.verifications = verificationsCopy;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            await prisma.listing.update({ where: { id: listing.id }, data: updates });
            console.log(`Updated listing: ${listing.id}`);
        }
    }
}

async function run() {
    console.log("Starting Migration from Cloudinary to R2...");
    try {
        await migrateUsers();
        await migrateInvoices();
        await migrateListingSets();
        await migrateListings();
        console.log("Migration Completed Successfully!");
    } catch (e) {
        console.error("Migration Failed:", e);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

run();
