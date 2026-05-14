/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(process.cwd(), ".env") });

const {
  CopyObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");
const CLEANUP = process.argv.includes("--cleanup");
const CLOUDINARY_RE = /https?:\/\/(?:res\.)?cloudinary\.com\/[^\s"'<>),\]}]+/gi;
const publicBase = (process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || "").replace(/\/$/, "");
const bucket = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "",
  },
});

function assertConfig() {
  const missing = [
    "DATABASE_URL",
    "CLOUDFLARE_R2_ACCOUNT_ID",
    "CLOUDFLARE_R2_ACCESS_KEY_ID",
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "CLOUDFLARE_R2_BUCKET_NAME",
    "NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL",
  ].filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
}

function serialize(value) {
  return JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function storageKeyFromPublicUrl(value) {
  if (typeof value !== "string" || !value.startsWith(`${publicBase}/`)) return null;
  return decodeURIComponent(value.slice(publicBase.length + 1));
}

function publicUrlFromKey(key) {
  return `${publicBase}/${key}`;
}

function safeSegment(value, fallback = "asset") {
  const safe = String(value || fallback)
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .pop()
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
  return safe || fallback;
}

function listingIdFromLegacyKey(key) {
  const parts = key.split("/");
  if ((parts[0] === "verifications" || parts[0] === "agreements") && parts[1]) return parts[1];
  return null;
}

function basenameWithoutExt(filename) {
  const safe = safeSegment(filename);
  const ext = path.posix.extname(safe);
  return ext ? safe.slice(0, -ext.length) : safe;
}

function canonicalKeyForLegacyKey(key, listingOwners) {
  const parts = key.split("/");
  const listingId = listingIdFromLegacyKey(key);
  if (!listingId) return null;

  const ownerId = listingOwners.get(listingId);
  if (!ownerId) throw new Error(`No listing owner found for ${listingId}`);

  if (parts[0] === "verifications") {
    const filename = safeSegment(parts.slice(2).join("-"), "verification.pdf");
    return `users/${ownerId}/listings/${listingId}/compliance/verification/general/${filename}`;
  }

  if (parts[0] === "agreements") {
    const filename = safeSegment(parts.slice(2).join("-"), "agreement.pdf");
    const agreementId = safeSegment(basenameWithoutExt(filename), "agreement");
    return `users/${ownerId}/listings/${listingId}/compliance/agreements/${agreementId}/signed.pdf`;
  }

  return null;
}

function canonicalKeyForUserScopedKey(key, listingByAssetUrl) {
  const parts = key.split("/");
  if (parts[0] !== "users" || !parts[1]) return null;

  const record = listingByAssetUrl.get(publicUrlFromKey(key));
  if (!record) return null;

  if (parts[2] === "listing_main") {
    return `users/${record.ownerId}/listings/${record.listingId}/media/main/${safeSegment(parts.slice(3).join("-"))}`;
  }

  if (parts[2] === "listing_videos") {
    return `users/${record.ownerId}/listings/${record.listingId}/media/videos/${safeSegment(parts.slice(3).join("-"))}`;
  }

  if (parts[2] === "listing_sets") {
    return `users/${record.ownerId}/listings/${record.listingId}/media/sets/${record.setId || "general"}/${safeSegment(parts.slice(3).join("-"))}`;
  }

  if (parts[2] === "addons") {
    return `users/${record.ownerId}/listings/${record.listingId}/addons/${record.addonId || "general"}/${safeSegment(parts.slice(3).join("-"))}`;
  }

  if (parts[2] === "verifications" && parts[3]) {
    return `users/${record.ownerId}/listings/${record.listingId}/compliance/verification/general/${safeSegment(parts.slice(4).join("-"))}`;
  }

  if (parts[2] === "invoices") {
    const invoiceId = basenameWithoutExt(safeSegment(parts.slice(3).join("-")));
    return `users/${parts[1]}/billing/invoices/${invoiceId}/invoice.pdf`;
  }

  return null;
}

async function listingAssetIndex() {
  const index = new Map();
  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      userId: true,
      imageSrc: true,
      videoSrc: true,
      addons: true,
      sets: { select: { id: true, images: true } },
    },
  });

  for (const listing of listings) {
    for (const url of listing.imageSrc || []) {
      index.set(url, { ownerId: listing.userId, listingId: listing.id });
    }
    if (listing.videoSrc) {
      index.set(listing.videoSrc, { ownerId: listing.userId, listingId: listing.id });
    }
    for (const set of listing.sets || []) {
      for (const url of set.images || []) {
        index.set(url, { ownerId: listing.userId, listingId: listing.id, setId: set.id });
      }
    }
    if (Array.isArray(listing.addons)) {
      for (const [indexValue, addon] of listing.addons.entries()) {
        if (!isObject(addon) || typeof addon.imageUrl !== "string") continue;
        index.set(addon.imageUrl, {
          ownerId: listing.userId,
          listingId: listing.id,
          addonId: typeof addon.id === "string" ? addon.id : `addon-${indexValue}`,
        });
      }
    }
  }

  const invoices = await prisma.invoice.findMany({
    select: { invoiceUrl: true, userId: true, invoiceNumber: true },
  });
  for (const invoice of invoices) {
    if (!invoice.invoiceUrl) continue;
    index.set(invoice.invoiceUrl, {
      ownerId: invoice.userId,
      listingId: "billing",
      invoiceId: invoice.invoiceNumber,
    });
  }

  return index;
}

function cloudinaryKeyFromUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const uploadIndex = parts.findIndex((part) => part === "upload");
  if (uploadIndex < 0) return null;

  const afterUpload = parts.slice(uploadIndex + 1);
  const versionIndex = afterUpload.findIndex((part) => /^v\d+$/.test(part));
  const keyParts = versionIndex >= 0 ? afterUpload.slice(versionIndex + 1) : afterUpload;
  return keyParts.map((part) => decodeURIComponent(part)).join("/").replace(/[^a-zA-Z0-9/._-]/g, "-");
}

function loadGenericSourceKeys() {
  const dir = path.join(process.cwd(), "dump", "cloudinary-r2-migration");
  const genericToSource = new Map();
  if (!fs.existsSync(dir)) return genericToSource;

  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith("-url-map.json") || file.includes("structured")) continue;
    const fullPath = path.join(dir, file);
    const map = JSON.parse(fs.readFileSync(fullPath, "utf8"));
    for (const [cloudinaryUrl, genericUrl] of Object.entries(map)) {
      const genericKey = storageKeyFromPublicUrl(genericUrl);
      const sourceKey = cloudinaryKeyFromUrl(cloudinaryUrl);
      if (genericKey && sourceKey) genericToSource.set(genericKey, sourceKey);
    }
  }

  return genericToSource;
}

function findStorageUrls(value, urls = new Set()) {
  if (typeof value === "string") {
    const key = storageKeyFromPublicUrl(value);
    if (key) urls.add(value);
    return urls;
  }

  if (Array.isArray(value)) {
    for (const item of value) findStorageUrls(item, urls);
    return urls;
  }

  if (isObject(value)) {
    for (const item of Object.values(value)) findStorageUrls(item, urls);
  }

  return urls;
}

function findCloudinaryUrls(value, urls = new Set()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(CLOUDINARY_RE)) urls.add(match[0]);
    return urls;
  }

  if (Array.isArray(value)) {
    for (const item of value) findCloudinaryUrls(item, urls);
    return urls;
  }

  if (isObject(value)) {
    for (const item of Object.values(value)) findCloudinaryUrls(item, urls);
  }

  return urls;
}

function replaceStrings(value, replacements) {
  if (typeof value === "string") return replacements.get(value) || value;

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const replaced = replaceStrings(item, replacements);
      if (replaced !== item) changed = true;
      return replaced;
    });
    return changed ? next : value;
  }

  if (isObject(value)) {
    let changed = false;
    const next = {};
    for (const [key, item] of Object.entries(value)) {
      const replaced = replaceStrings(item, replacements);
      if (replaced !== item) changed = true;
      next[key] = replaced;
    }
    return changed ? next : value;
  }

  return value;
}

async function listCollections() {
  const result = await prisma.$runCommandRaw({ listCollections: 1, nameOnly: true });
  return (result.cursor?.firstBatch || [])
    .map((collection) => collection.name)
    .filter((name) => !name.startsWith("system."));
}

async function findAllDocuments(collection) {
  const docs = [];
  let result = await prisma.$runCommandRaw({ find: collection, filter: {}, batchSize: 100 });
  docs.push(...(result.cursor?.firstBatch || []));
  let cursorId = result.cursor?.id;

  while (cursorId && cursorId !== 0) {
    result = await prisma.$runCommandRaw({ getMore: cursorId, collection, batchSize: 100 });
    docs.push(...(result.cursor?.nextBatch || []));
    cursorId = result.cursor?.id;
  }

  return docs;
}

async function ownerMapForListings(listingIds) {
  if (listingIds.size === 0) return new Map();

  const listings = await prisma.listing.findMany({
    where: { id: { in: [...listingIds] } },
    select: { id: true, userId: true },
  });

  return new Map(listings.map((listing) => [listing.id, listing.userId]));
}

async function objectExists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function copyObject(sourceKey, targetKey) {
  if (await objectExists(targetKey)) return;

  await r2.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodeURI(sourceKey)}`,
      Key: targetKey,
    })
  );
}

function ensureDumpDir() {
  const dir = path.join(process.cwd(), "dump", "cloudinary-r2-migration");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function deleteKeys(keys) {
  const unique = [...new Set(keys)].filter(Boolean);
  for (let i = 0; i < unique.length; i += 1000) {
    const chunk = unique.slice(i, i + 1000);
    await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })) },
      })
    );
  }
  return unique.length;
}

async function listPrefix(prefix) {
  const keys = [];
  let ContinuationToken;
  do {
    const result = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken,
      })
    );
    keys.push(...(result.Contents || []).map((item) => item.Key).filter(Boolean));
    ContinuationToken = result.NextContinuationToken;
  } while (ContinuationToken);
  return keys;
}

async function main() {
  assertConfig();

  const genericToSource = loadGenericSourceKeys();
  const collections = await listCollections();
  const docs = [];
  const staleUrls = new Set();
  const cloudinaryDocs = [];
  const cloudinaryUrls = new Set();
  const listingIds = new Set();
  const listingByAssetUrl = await listingAssetIndex();

  for (const collection of collections) {
    for (const doc of await findAllDocuments(collection)) {
      const foundCloudinaryUrls = findCloudinaryUrls(doc);
      if (foundCloudinaryUrls.size > 0) {
        cloudinaryDocs.push({ collection, id: doc._id, urls: [...foundCloudinaryUrls] });
        for (const url of foundCloudinaryUrls) cloudinaryUrls.add(url);
      }

      const urls = findStorageUrls(doc);
      const stale = [...urls].filter((url) => {
        const key = storageKeyFromPublicUrl(url);
        return (
          key?.startsWith("verifications/") ||
          key?.startsWith("agreements/") ||
          key?.startsWith("migrated/cloudinary/") ||
          Boolean(canonicalKeyForUserScopedKey(key || "", listingByAssetUrl))
        );
      });
      if (stale.length === 0) continue;

      docs.push({ collection, doc, stale });
      for (const url of stale) {
        const key = storageKeyFromPublicUrl(url);
        staleUrls.add(url);
        const sourceKey = key.startsWith("migrated/cloudinary/") ? genericToSource.get(key) : key;
        const listingId = sourceKey ? listingIdFromLegacyKey(sourceKey) : null;
        if (listingId) listingIds.add(listingId);
      }
    }
  }

  const listingOwners = await ownerMapForListings(listingIds);
  const replacements = new Map();
  const copyPlan = [];

  for (const url of staleUrls) {
    const sourceKey = storageKeyFromPublicUrl(url);
    const legacyKey = sourceKey.startsWith("migrated/cloudinary/") ? genericToSource.get(sourceKey) : sourceKey;
    if (!legacyKey) throw new Error(`No source mapping found for ${sourceKey}`);

    const targetKey =
      canonicalKeyForLegacyKey(legacyKey, listingOwners) ||
      canonicalKeyForUserScopedKey(sourceKey, listingByAssetUrl);
    if (!targetKey) throw new Error(`Could not canonicalize ${sourceKey}`);
    if (targetKey === sourceKey) continue;

    replacements.set(url, publicUrlFromKey(targetKey));
    replacements.set(sourceKey, targetKey);
    replacements.set(legacyKey, targetKey);
    copyPlan.push({ sourceKey, legacyKey, targetKey });
  }

  console.log(`Documents with stale R2 URLs: ${docs.length}`);
  console.log(`Unique stale R2 URLs: ${staleUrls.size}`);
  console.log(`Cloudinary documents: ${cloudinaryDocs.length}`);
  console.log(`Cloudinary unique URLs: ${cloudinaryUrls.size}`);
  console.log(`Objects to canonicalize: ${copyPlan.length}`);
  for (const item of copyPlan) console.log(`${item.sourceKey} -> ${item.targetKey}`);

  if (cloudinaryUrls.size > 0) {
    for (const hit of cloudinaryDocs) {
      console.log(`${hit.collection} ${serialize(hit.id)} ${hit.urls.length}`);
      for (const url of hit.urls) console.log(`  ${url}`);
    }
    process.exitCode = 1;
    if (!APPLY) return;
    throw new Error("Cloudinary URLs must be migrated before canonical R2 cleanup can run");
  }

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to copy objects and update MongoDB.");
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dumpDir = ensureDumpDir();
  const backupPath = path.join(dumpDir, `${stamp}-canonical-storage-backup.jsonl`);
  const mapPath = path.join(dumpDir, `${stamp}-canonical-storage-url-map.json`);
  fs.writeFileSync(mapPath, `${serialize(Object.fromEntries([...replacements].filter(([key]) => key.startsWith(publicBase))))}\n`, "utf8");

  for (const item of copyPlan) {
    await copyObject(item.sourceKey, item.targetKey);
    if (!(await objectExists(item.targetKey))) throw new Error(`Target object verification failed: ${item.targetKey}`);
  }

  let updated = 0;
  for (const hit of docs) {
    const after = replaceStrings(hit.doc, replacements);
    if (after === hit.doc) continue;

    fs.appendFileSync(
      backupPath,
      `${serialize({ collection: hit.collection, id: hit.doc._id, before: hit.doc, after })}\n`,
      "utf8"
    );

    const result = await prisma.$runCommandRaw({
      update: hit.collection,
      updates: [{ q: { _id: hit.doc._id }, u: after }],
    });
    if (result.ok !== 1 || result.n !== 1) {
      throw new Error(`Unexpected update result for ${hit.collection}/${serialize(hit.doc._id)}`);
    }
    updated += 1;
  }

  const remaining = [];
  for (const collection of collections) {
    for (const doc of await findAllDocuments(collection)) {
      const urls = findStorageUrls(doc);
      const stale = [...urls].filter((url) => {
        const key = storageKeyFromPublicUrl(url);
        return (
          key?.startsWith("verifications/") ||
          key?.startsWith("agreements/") ||
          key?.startsWith("migrated/cloudinary/") ||
          Boolean(canonicalKeyForUserScopedKey(key || "", listingByAssetUrl))
        );
      });
      if (stale.length > 0) remaining.push({ collection, id: doc._id, stale });
    }
  }

  let deleted = 0;
  if (CLEANUP) {
    if (remaining.length > 0) throw new Error("Refusing cleanup while stale DB references remain");

    const copiedSourceKeys = copyPlan.map((item) => item.sourceKey);
    const copiedLegacyKeys = copyPlan.map((item) => item.legacyKey).filter((key) => !key.startsWith("migrated/cloudinary/"));
    const genericKeys = await listPrefix("migrated/cloudinary/");
    deleted = await deleteKeys([...copiedSourceKeys, ...copiedLegacyKeys, ...genericKeys]);
  }

  console.log(`Updated documents: ${updated}`);
  console.log(`Remaining stale DB documents: ${remaining.length}`);
  console.log(`Deleted obsolete objects: ${deleted}`);
  console.log(`Backup: ${backupPath}`);
  console.log(`URL map: ${mapPath}`);

  if (remaining.length > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
