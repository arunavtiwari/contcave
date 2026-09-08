import "server-only";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { r2 } from "@/lib/storage/r2";

const PRIVATE_REF_PREFIX = "r2-private://";
const MAX_KEY_LENGTH = 1_024;

function assertStorageKey(value: string) {
  const key = value.trim().replace(/^\/+/, "");
  if (!key || key.length > MAX_KEY_LENGTH || key.includes("..") || key.includes("\\") || /[\u0000-\u001f]/.test(key)) {
    throw new Error("Invalid private document key");
  }
  return key;
}

export function getPrivateDocumentBucket() {
  const bucket = process.env.CLOUDFLARE_R2_PRIVATE_BUCKET_NAME?.trim();
  if (!bucket) throw new Error("Missing private R2 bucket config");
  return bucket;
}

export function toPrivateDocumentRef(key: string) {
  return `${PRIVATE_REF_PREFIX}${assertStorageKey(key)}`;
}

export function privateDocumentKey(ref: string) {
  if (!ref.startsWith(PRIVATE_REF_PREFIX)) return null;
  return assertStorageKey(ref.slice(PRIVATE_REF_PREFIX.length));
}

function getPrivateDocumentLocation(ref: string) {
  const privateKey = privateDocumentKey(ref);
  if (!privateKey) throw new Error("Invalid or non-private document reference");
  return { bucket: getPrivateDocumentBucket(), key: privateKey };
}

export async function uploadPrivateDocument(params: {
  key: string;
  body: Buffer;
  contentType?: string;
}) {
  const key = assertStorageKey(params.key);
  await r2.send(new PutObjectCommand({
    Bucket: getPrivateDocumentBucket(),
    Key: key,
    Body: params.body,
    ContentType: params.contentType || "application/pdf",
    CacheControl: "private, no-store",
  }));
  return toPrivateDocumentRef(key);
}

export async function readPrivateDocument(ref: string, maxBytes = 10_000_000) {
  const { bucket, key } = getPrivateDocumentLocation(ref);
  const result = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!result.Body) throw new Error("Document body is unavailable");
  if (typeof result.ContentLength === "number" && result.ContentLength > maxBytes) {
    throw new Error("Document exceeds size limit");
  }
  const bytes = await result.Body.transformToByteArray();
  if (bytes.byteLength > maxBytes) throw new Error("Document exceeds size limit");
  return Buffer.from(bytes);
}

function safeDownloadName(value: string) {
  const name = value.replace(/[\r\n"\\/]/g, "_").trim().slice(0, 180);
  return name || "document.pdf";
}

export async function createPrivateDocumentDownloadUrl(ref: string, filename: string) {
  const { bucket, key } = getPrivateDocumentLocation(ref);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentType: "application/pdf",
    ResponseContentDisposition: `inline; filename="${safeDownloadName(filename)}"`,
    ResponseCacheControl: "private, no-store",
  });
  return getSignedUrl(r2, command, { expiresIn: 60 });
}
