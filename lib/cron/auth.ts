import { timingSafeEqual } from "node:crypto";

import { NextRequest } from "next/server";

export function hasValidCronSecret(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const provided = req.headers.get("x-github-secret")
    || req.headers.get("x-cron-secret")
    || req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && timingSafeEqual(expectedBuffer, providedBuffer);
}
