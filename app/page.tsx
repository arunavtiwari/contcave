import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import Feature from "@/components/Features";
import FeaturesTab from "@/components/FeaturesTab";
import FunFact from "@/components/FunFact";
import Hero from "@/components/Hero";
import type { Metadata } from "next";
import {
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
  inLanguage: "en",
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: `${SITE_URL}${OG_IMAGE}`,
  },
  about: BRAND_NAME,
} as const;

export const metadata: Metadata = {
  title: BRAND_TITLE,
  description: HOME_DESCRIPTION,
  keywords: [...DEFAULT_KEYWORDS],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: BRAND_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description: HOME_DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [OG_IMAGE],
  },
};

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }}
      />
      <Hero />
      <Feature />
      <FeaturesTab />
      <FunFact />
      <FAQ />
      <CTA />
      {/* Optional components */}
      {/* <Cover /> */}
      {/* <Contact /> */}
      {/* <Blog /> */}
    </main>
  );
}

