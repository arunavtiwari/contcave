import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import CTA from "@/components/CTA";
import FAQ from "@/components/FAQ";
import Feature from "@/components/Features";
import FeaturesTab from "@/components/FeaturesTab";
import Footer from "@/components/Footer";
import FunFact from "@/components/FunFact";
import Hero from "@/components/Hero";
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
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: BRAND_TITLE,
    description: HOME_DESCRIPTION,
    type: "website",
    url: SITE_URL,
    siteName: BRAND_NAME,
    images: [
      {
        url: absoluteUrl(OG_IMAGE),
        width: 1200,
        height: 630,
        alt: BRAND_NAME,
      },
    ],
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
  const currentUser = await getCurrentUser();

  return (
    <>
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd).replace(/</g, '\\u003c') }}
        />
        <Hero />
        <Feature />
        <FeaturesTab />
        <FunFact />
        <FAQ />
        <CTA currentUser={currentUser} />
      </main>
      <Footer />
    </>
  );
}

