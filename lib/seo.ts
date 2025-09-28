export const SITE_URL = "https://www.contcave.com" as const;
export const BRAND_NAME = "ContCave" as const;
export const BRAND_TITLE = `${BRAND_NAME} | Find the Perfect Shoot Space with Ease` as const;
export const BRAND_DESCRIPTION =
  "ContCave helps creators discover, compare, and book verified studios and production-ready spaces across India." as const;
export const OG_IMAGE = "/images/logo/logo-dark.png" as const;

export const DEFAULT_KEYWORDS = [
  "studio booking",
  "creative studio rental",
  "event spaces",
  "shoot location",
  "photography studio",
  "video shoot location",
  "ContCave",
] as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

