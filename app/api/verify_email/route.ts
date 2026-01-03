import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email || typeof email !== "string") {
      return createErrorResponse("email is required and must be a string", 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      return createErrorResponse("Invalid email format", 400);
    }

    if (trimmedEmail.length > 255) {
      return createErrorResponse("Email is too long", 400);
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    if (!authKey || typeof authKey !== "string") {
      return createErrorResponse("Server configuration error", 500);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let resp: Response;
    try {
      resp = await fetch("https://control.msg91.com/api/v5/email/validate", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify({ email: trimmedEmail }),
        signal: controller.signal,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return createErrorResponse("Request timeout", 408);
      }
      throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "Unknown error");
      return createErrorResponse(
        `Email validation service error: ${errorText}`,
        resp.status
      );
    }

    const data = await resp.json().catch(() => ({}));

    return createSuccessResponse(data);
  } catch (err) {
    return handleRouteError(err, "POST /api/verify_email");
  }
}
