import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";

import CTA from "@/components/landing/CTA";
import FAQ from "@/components/landing/FAQ";
import ForBrands from "@/components/landing/ForBrands";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";
import StudioShowcase from "@/components/landing/StudioShowcase";
import {
  absoluteUrl,
  BRAND_NAME,
  BRAND_TITLE,
  DEFAULT_KEYWORDS,
  OG_IMAGE,
  SITE_URL,
} from "@/lib/seo";

const HOME_DESCRIPTION =
  "Book the ideal shoot space for your next production with ContCave - India's trusted marketplace for photography, film, and event-ready studios." as const;

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/#home`,
  url: SITE_URL,
  name: BRAND_TITLE,
  description: HOME_DESCRIPTION,
  isPartOf: { "@id": `${SITE_URL}/#website` },
  publisher: { "@id": `${SITE_URL}/#localbusiness` },
  inLanguage: "en-IN",
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: `${SITE_URL}${OG_IMAGE}`,
    width: 1200,
    height: 630,
  },
  about: { "@id": `${SITE_URL}/#localbusiness` },
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
    ],
  },
} as const;

export const metadata: Metadata = {
  title: { absolute: BRAND_TITLE },
  description: HOME_DESCRIPTION,
  keywords: [...DEFAULT_KEYWORDS],
  alternates: { canonical: "/" },
  openGraph: {
    title: BRAND_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: BRAND_NAME,
    images: [{ url: absoluteUrl(OG_IMAGE), width: 1200, height: 630, alt: BRAND_NAME }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description: HOME_DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [absoluteUrl(OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default async function Home() {
  const headerList = await headers();
  const nonce = headerList.get("x-nonce") || "";

  return (
    <main>
      <Script
        id="home-jsonld"
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, "\\u003c") }}
      />

      {/* 1. Hero —  full-viewport, city search */}
      <Hero />

      {/* 2. Studio Showcase —  6-card grid */}
      <StudioShowcase />

      {/* 3. For Brands & Agencies —  two-path layout */}
      <ForBrands />

      {/* 4. How It Works —  3-step flow */}
      <HowItWorks />

      {/* 5. Social Proof —  video + 2-row reviews */}
      <SocialProof />

      {/* 6. FAQ */}
      <FAQ nonce={nonce} />

      {/* 7. For Studio Owners —  CTA */}
      <CTA />
    </main>
  );
}
