export const SITE_URL = "https://contcave.com" as const;
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
  "contcave",
  "book studio",
  "book a studio near me",
  "podcast studio near me",
  "shoot space rental",
  "event space rental",
  "hourly studio rental",
  "podcast studio",
  "dance studio rental",
  "recording studio",
  "green screen studio",
  "fashion photography studio",
  "film production studio",
  "rehearsal space",
  "yoga studio rental",
  "art studio rental",
  "workshop space",
  "meeting room rental",
  "content creation studio",
  "youtube studio rental",
  "rent studio hourly",
  "affordable studio rental",
  "professional studio rental",
  "studio rental India",
  "cyclorama studio",
  "studios in delhi",
  "studios in bangalore",
  "studios in mumbai",
  "studios in jaipur",
  "studios in hyderabad",
  "studios in pune",
  "studios in surat",
  "studios in chennai",
  "studios in ahemdabad",
  "podcast studios in delhi",
  "podcast studios in bangalore",
  "podcast studios in mumbai",
  "podcast studios in jaipur",
  "podcast studios in hyderabad",
  "podcast studios in pune",
  "podcast studios in surat",
  "podcast studios in chennai",
  "podcast studios in ahemdabad",

] as const;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
