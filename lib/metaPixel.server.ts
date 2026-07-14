import "server-only";

import { createHash } from "node:crypto";

import { META_PIXEL_ID } from "@/constants/metaPixel";
import type { CAPIEventPayload, CAPIResponse } from "@/types/metaPixel";

export function sha256(value: string): string {
  return createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

export async function sendServerEvent(payload: CAPIEventPayload): Promise<CAPIResponse | null> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!META_PIXEL_ID || !accessToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Meta CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN — skipping server event.");
    }
    return null;
  }

  const body: Record<string, unknown> = { data: [payload] };
  if (process.env.META_CAPI_TEST_CODE) {
    body.test_event_code = process.env.META_CAPI_TEST_CODE;
  }

  const url = `https://graph.facebook.com/v22.0/${META_PIXEL_ID}/events?access_token=${accessToken}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      console.error(`[Meta CAPI] HTTP ${response.status} for ${payload.event_name}:`, await response.text());
      return null;
    }
    return await response.json() as CAPIResponse;
  } catch (error) {
    console.error("[Meta CAPI] Network error:", error);
    return null;
  }
}

export function extractFbp(cookieString = ""): string | undefined {
  return cookieString.match(/(?:^|;\s*)_fbp=([^;]+)/)?.[1];
}

export function buildFbc(fbclid: string | null | undefined): string | undefined {
  if (!fbclid) return undefined;
  return `fb.1.${Date.now()}.${fbclid}`;
}
