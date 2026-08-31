import "server-only";

export function getAblyApiKey(): string | null {
  const key = process.env.ABLY_CHAT_API;
  return key?.trim() || null;
}
