import "server-only";

import { createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prismadb";
import { SEARCH_CONFIG } from "@/lib/search/config";
import type { SessionRecord } from "@/lib/search/service";
import type { SearchEvent } from "@/schemas/search";

const SESSION_ID_PATTERN = /^[a-f\d]{24}$/;

let signingKey: Buffer | undefined;

function sessionSigningKey() {
    if (signingKey) return signingKey;
    const secret = process.env.AUTH_SECRET;
    if (!secret) throw new Error("Server configuration error (AUTH_SECRET)");
    signingKey = Buffer.from(hkdfSync("sha256", secret, "", "contcave:search-session", 32));
    return signingKey;
}

const signatureOf = (id: string) => createHmac("sha256", sessionSigningKey()).update(id).digest("base64url");

export function newSearchSessionToken() {
    const id = randomBytes(12).toString("hex");
    return `${id}.${signatureOf(id)}`;
}

export function sessionIdFromToken(token: string): string | null {
    const [id, provided, ...rest] = token.split(".");
    if (!id || !provided || rest.length || !SESSION_ID_PATTERN.test(id)) return null;
    const expected = Buffer.from(signatureOf(id));
    const actual = Buffer.from(provided);
    return expected.length === actual.length && timingSafeEqual(expected, actual) ? id : null;
}

const expiresAt = () => new Date(Date.now() + SEARCH_CONFIG.sessionTtlMs);

const asJson = (value: unknown) => value as Prisma.InputJsonValue;

export async function recordSearchSession(token: string, record: SessionRecord, userId: string | null) {
    const id = sessionIdFromToken(token);
    if (!id) throw new Error("Invalid search session token");
    const data = {
        query: record.query,
        parsedQuery: asJson(record.parsed),
        source: record.source,
        overrides: asJson(record.overrides),
        results: asJson(record.results),
        curated: asJson(record.curated),
        resultCount: record.resultCount,
        goodCount: record.goodCount,
        timings: asJson(record.timings),
        userId,
    };
    await prisma.searchSession.upsert({
        where: { id },
        create: { id, ...data, expiresAt: expiresAt() },
        update: data,
    });
}

export async function recordSearchEvent(event: SearchEvent) {
    const id = sessionIdFromToken(event.sessionToken);
    if (!id) return false;
    const entry = { type: event.type, listingId: event.listingId ?? null, at: new Date() };
    await prisma.searchSession.upsert({
        where: { id },
        create: { id, events: [entry], expiresAt: expiresAt() },
        update: { events: { push: entry } },
    });
    return true;
}
