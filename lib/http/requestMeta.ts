export function getClientIp(headers: Headers) {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function getUserAgent(headers: Headers) {
  return headers.get("user-agent") || "unknown";
}
