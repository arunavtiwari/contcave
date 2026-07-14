import prisma from "@/lib/prismadb";

export type RefreshedGoogleToken = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
};

export function getGoogleClientCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar credentials are not configured");
  }
  return { clientId, clientSecret };
}

export async function refreshGoogleCalendarAccessToken(
  accountId: string,
  refreshToken: string
): Promise<RefreshedGoogleToken> {
  const { clientId, clientSecret } = getGoogleClientCredentials();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const raw = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }
  const token = payload && typeof payload === "object"
    ? payload as Partial<RefreshedGoogleToken> & { error?: unknown }
    : null;
  if (!response.ok || typeof token?.access_token !== "string" || !token.access_token) {
    throw new Error("Failed to refresh Google Calendar access");
  }

  const nextRefreshToken = typeof token.refresh_token === "string" && token.refresh_token
    ? token.refresh_token
    : refreshToken;
  await prisma.account.update({
    where: { id: accountId },
    data: {
      access_token: token.access_token,
      refresh_token: nextRefreshToken,
      expires_at: typeof token.expires_in === "number"
        ? Math.floor(Date.now() / 1000) + token.expires_in
        : null,
    },
  });

  return {
    access_token: token.access_token,
    refresh_token: nextRefreshToken,
    ...(typeof token.expires_in === "number" ? { expires_in: token.expires_in } : {}),
  };
}

export function isGoogleCalendarAuthError(error: unknown): boolean {
  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  const status = Number(candidate?.code || candidate?.status || 0);
  const message = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";
  return status === 401 || message.includes("invalid credentials") || message.includes("invalid_grant") || message.includes("unauthorized");
}
