export const SITE_URL = "https://contcave.com" as const;
export const BRAND_NAME = "ContCave" as const;
export const BRAND_TITLE = `${BRAND_NAME} | Find the Perfect Shoot Space with Ease` as const;
export const BRAND_DESCRIPTION =
  "ContCave helps creators discover, compare, and book verified studios and production-ready spaces across India." as const;
export const OG_IMAGE = "/images/logo/logo-og.png" as const;

export const DEFAULT_KEYWORDS = [
  "studio booking",
  "creative studio rental",
  "shoot location",
  "photography studio",
  "video shoot location",
  "ContCave",
  "book a studio near me",
  "shoot space rental",
  "hourly studio rental",
  "podcast studio",
  "content creation studio",
  "film production studio",
  "green screen studio",
  "cyclorama studio",
  "studio rental India",
  "studios in delhi",
  "studios in bangalore",
  "studios in mumbai",
  "studios in hyderabad",
  "studios in pune",
  "studios in chennai",
  "studios in ahmedabad",
  "studios in jaipur",
  "studios in surat",
] as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}


export const asciiClean = (value: string | string[] | undefined | null): string | undefined => {
  const source = Array.isArray(value) ? value.join(" ") : value;
  return source
    ?.replace(/<[^>]*>?/gm, " ")
    .replace(/&#?[a-z0-9]+;/gi, " ")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};
