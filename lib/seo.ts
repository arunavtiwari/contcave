import { getPlainTextFromHTML } from "@/lib/richText";
import type { Faq } from "@/types/faq";

export const SITE_URL = "https://contcave.com" as const;
export const ORGANIZATION_ID = `${SITE_URL}/#organization` as const;
export const WEBSITE_ID = `${SITE_URL}/#website` as const;
export const BRAND_NAME = "ContCave" as const;
export const TITLE_SUFFIX = ` | ${BRAND_NAME}` as const;
export const TITLE_LENGTH = 60 - TITLE_SUFFIX.length;
export const BRAND_TITLE = `Book Photography, Video & Podcast Studios on Rent${TITLE_SUFFIX}` as const;
export const BRAND_DESCRIPTION =
  "ContCave helps creators discover, compare, and book verified studios and production-ready spaces across India." as const;
export const OG_IMAGE = "/images/logo/logo-og.png" as const;

export const FOUNDERS = [
  { name: "Arunav Tiwari", jobTitle: "Chief Executive Officer", sameAs: "https://www.linkedin.com/in/art-x/" },
  { name: "Shubham Samanta", jobTitle: "Chief Technology Officer", sameAs: "https://www.linkedin.com/in/sam8239/" },
  {
    name: "Harshita Betala",
    jobTitle: "Chief Product Officer",
    sameAs: "https://www.linkedin.com/in/harshita-betala-ab4b32169/",
  },
] as const;

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

export const META_DESCRIPTION_LENGTH = 160;

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const toPlainText = (value: string | string[] | undefined | null): string | undefined => {
  const source = Array.isArray(value) ? value.join(" ") : value;
  return getPlainTextFromHTML(source, 0) || undefined;
};

export type BreadcrumbItem = { name: string; href?: string };

export const breadcrumbJsonLd = (items: BreadcrumbItem[], pageUrl: string) => ({
  "@type": "BreadcrumbList",
  "@id": `${pageUrl}#breadcrumb`,
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.href ?? pageUrl),
  })),
});

export const FAQ_ANCHOR = "faq";

export const faqJsonLd = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: { "@type": "Answer", text: answer },
  })),
});

export const BRAND_LOGO = {
  "@type": "ImageObject",
  url: `${SITE_URL}/images/logo/logo_small.png`,
  width: 1220,
  height: 1188,
} as const;
