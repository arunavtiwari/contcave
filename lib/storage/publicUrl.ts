function getConfiguredPublicBase(): URL {
  const configured = process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL;
  if (!configured) throw new Error("Missing Cloudflare public URL config");

  let parsed: URL;
  try {
    parsed = new URL(configured);
  } catch {
    throw new Error("Invalid Cloudflare public URL config");
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Cloudflare public URL must be a clean HTTPS URL");
  }
  return parsed;
}

export function buildR2PublicUrl(key: string): string {
  const base = getConfiguredPublicBase();
  const basePath = base.pathname.replace(/\/+$/, "");
  const encodedKey = key.split("/").filter(Boolean).map(encodeURIComponent).join("/");
  return `${base.origin}${basePath}/${encodedKey}`;
}

export function isTrustedR2PublicUrl(value: string): boolean {
  try {
    const base = getConfiguredPublicBase();
    const candidate = new URL(value);
    const basePath = `${base.pathname.replace(/\/+$/, "")}/`;
    return candidate.origin === base.origin
      && candidate.pathname.startsWith(basePath)
      && !candidate.username
      && !candidate.password;
  } catch {
    return false;
  }
}
