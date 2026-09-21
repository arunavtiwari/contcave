import "server-only";

import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

import { getPrivateDocumentBucket, privateDocumentKey } from "@/lib/storage/privateDocuments";
import { isTrustedR2PublicUrl } from "@/lib/storage/publicUrl";
import { r2 } from "@/lib/storage/r2";

const MAX_KEYS_PER_REQUEST = 1_000;
const MAX_ATTEMPTS = 3;

export type MediaDeletionOutcome = { deleted: number; failed: number };

function publicMediaKey(value: unknown): string | null {
    if (typeof value !== "string" || !isTrustedR2PublicUrl(value)) return null;
    try {
        const key = decodeURIComponent(new URL(value).pathname.replace(/^\/+/, ""));
        return key || null;
    } catch {
        return null;
    }
}

function privateMediaKey(value: unknown): string | null {
    if (typeof value !== "string") return null;
    try {
        return privateDocumentKey(value);
    } catch {
        return null;
    }
}

function storageKeyForRef(value: unknown): { key: string; access: "public" | "private" } | null {
    const privateKey = privateMediaKey(value);
    if (privateKey) return { key: privateKey, access: "private" };
    const publicKey = publicMediaKey(value);
    if (publicKey) return { key: publicKey, access: "public" };
    return null;
}

export function isOwnedMediaRef(ref: unknown, ownerId: string, sourceId?: string): boolean {
    const resolved = storageKeyForRef(ref);
    if (!resolved) return false;
    if (ownerId && resolved.key.startsWith(`users/${ownerId}/`)) return true;
    if (sourceId && /^[a-f\d]{24}$/i.test(sourceId) && resolved.key.includes(`/listings/${sourceId}/`)) return true;
    return false;
}

function keysOwnedBy(
    keys: Iterable<string>,
    ownerIds: Iterable<string>,
    sourceIds: Iterable<string> = []
): string[] {
    const prefixes = Array.from(ownerIds).filter(Boolean).map((ownerId) => `users/${ownerId}/`);
    const validSources = Array.from(sourceIds).filter((s) => /^[a-f\d]{24}$/i.test(s)).map((s) => `/listings/${s}/`);
    if (prefixes.length === 0 && validSources.length === 0) return [];
    return Array.from(new Set(keys)).filter((key) =>
        prefixes.some((prefix) => key.startsWith(prefix)) ||
        validSources.some((source) => key.includes(source))
    );
}

function resolvePrivateBucket(): string | undefined {
    try {
        return getPrivateDocumentBucket();
    } catch {
        return undefined;
    }
}

async function deleteKeys(bucket: string | undefined, keys: string[], access: "public" | "private"): Promise<MediaDeletionOutcome> {
    if (!bucket || keys.length === 0) return { deleted: 0, failed: 0 };

    let deleted = 0;
    let failed = 0;
    for (let index = 0; index < keys.length; index += MAX_KEYS_PER_REQUEST) {
        const chunk = keys.slice(index, index + MAX_KEYS_PER_REQUEST);
        const command = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
        });

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
            try {
                await r2.send(command);
                deleted += chunk.length;
                break;
            } catch (error) {
                if (attempt === MAX_ATTEMPTS) {
                    failed += chunk.length;
                    console.error(`[MediaCleanup] Unable to delete ${access} objects after ${MAX_ATTEMPTS} attempts`, {
                        count: chunk.length,
                        error: error instanceof Error ? error.message : String(error),
                    });
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, attempt * 500));
            }
        }
    }
    return { deleted, failed };
}

export async function deleteStoredMedia(
    refs: Iterable<unknown>,
    ownerIds: Iterable<string>,
    sourceIds: Iterable<string> = []
): Promise<MediaDeletionOutcome> {
    try {
        const publicKeys: string[] = [];
        const privateKeys: string[] = [];

        for (const ref of refs) {
            const resolved = storageKeyForRef(ref);
            if (!resolved) continue;
            if (resolved.access === "private") privateKeys.push(resolved.key);
            else publicKeys.push(resolved.key);
        }

        const owners = Array.from(ownerIds).filter(Boolean);
        const [publicOutcome, privateOutcome] = await Promise.all([
            deleteKeys(process.env.CLOUDFLARE_R2_BUCKET_NAME, keysOwnedBy(publicKeys, owners, sourceIds), "public"),
            deleteKeys(resolvePrivateBucket(), keysOwnedBy(privateKeys, owners, sourceIds), "private"),
        ]);
        return {
            deleted: publicOutcome.deleted + privateOutcome.deleted,
            failed: publicOutcome.failed + privateOutcome.failed,
        };
    } catch (error) {
        console.error("[MediaCleanup] Cleanup pass failed", error);
        return { deleted: 0, failed: 1 };
    }
}
