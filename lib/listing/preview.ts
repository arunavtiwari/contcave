import "server-only";

import crypto from "crypto";

import { listingPath } from "@/lib/listing/seo";

export const LISTING_PREVIEW_PARAM = "preview";

const PREVIEW_TTL_SECONDS = 30 * 24 * 60 * 60;
const EXPIRY_PATTERN = /^[0-9a-z]{1,10}$/;

type VisibilityFields = { active: boolean; status: string; listingType: string | null };
type ShareableListing = VisibilityFields & { id: string; slug: string | null };

export type ListingShareLink = { path: string; expiresAt: string | null };

export const isListingPublic = (listing: VisibilityFields) =>
  listing.active && (listing.status === "VERIFIED" || listing.listingType === "CURATED");

let signingKey: Buffer | undefined;

function previewSigningKey() {
  if (signingKey) return signingKey;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Server configuration error (AUTH_SECRET)");
  signingKey = Buffer.from(crypto.hkdfSync("sha256", secret, "", "contcave:listing-preview", 32));
  return signingKey;
}

const signature = (listingId: string, expiresAt: number) =>
  crypto.createHmac("sha256", previewSigningKey()).update(`${listingId}.${expiresAt}`).digest("base64url");

export function isValidListingPreviewToken(listingId: string, token: string | undefined, now = Date.now()) {
  const [encodedExpiry, provided, ...rest] = token?.split(".") ?? [];
  if (!encodedExpiry || !provided || rest.length || !EXPIRY_PATTERN.test(encodedExpiry)) return false;

  const expiresAt = parseInt(encodedExpiry, 36);
  if (expiresAt * 1000 <= now) return false;

  const expected = Buffer.from(signature(listingId, expiresAt));
  const actual = Buffer.from(provided);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

export function listingShareLink(listing: ShareableListing, now = Date.now()): ListingShareLink {
  const path = listingPath(listing);
  if (isListingPublic(listing)) return { path, expiresAt: null };

  const expiresAt = Math.floor(now / 1000) + PREVIEW_TTL_SECONDS;
  const token = `${expiresAt.toString(36)}.${signature(listing.id, expiresAt)}`;
  return {
    path: `${path}?${LISTING_PREVIEW_PARAM}=${token}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}
