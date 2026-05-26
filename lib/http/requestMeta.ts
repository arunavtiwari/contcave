export function getClientIp(headers: Headers) {
  return (
    headers.get("x-vercel-forwarded-for") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ||
    "unknown"
  );
}

export function getUserAgent(headers: Headers) {
  return headers.get("user-agent") || "unknown";
}
