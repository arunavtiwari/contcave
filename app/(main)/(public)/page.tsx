import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getRandomListings from "@/app/actions/getRandomListings";
import CTA from "@/components/landing/CTA";
import FAQ from "@/components/landing/FAQ";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductionConcierge from "@/components/landing/ProductionConcierge";
import SocialProof from "@/components/landing/SocialProof";
import StudioShowcase from "@/components/landing/StudioShowcase";
import VerifiedVsCurated from "@/components/landing/VerifiedVsCurated";
import JsonLd from "@/components/seo/JsonLd";
import {
  absoluteUrl,
  BRAND_DESCRIPTION,
  BRAND_LOGO,
  BRAND_NAME,
  BRAND_TITLE,
  DEFAULT_KEYWORDS,
  OG_IMAGE,
  SITE_URL,
} from "@/lib/seo";

const HOME_DESCRIPTION =
  "Book the ideal shoot space for your next production with ContCave - India's trusted marketplace for photography, film, and event-ready studios." as const;

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: BRAND_NAME,
  legalName: "Arkanet Ventures LLP",
  url: SITE_URL,
  description: BRAND_DESCRIPTION,
  image: `${SITE_URL}${OG_IMAGE}`,
  logo: BRAND_LOGO,
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  email: "info@contcave.com",
  foundingDate: "2024",
  parentOrganization: { "@id": `${SITE_URL}/#organization` },
  sameAs: [
    "https://www.instagram.com/contcave",
    "https://www.linkedin.com/company/contcave",
    "https://x.com/contcave",
  ],
} as const;

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/#service`,
  name: "Studio Booking Platform",
  description: "Online marketplace for booking photography, video, and event studios across India",
  provider: { "@id": `${SITE_URL}/#localbusiness` },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  serviceType: "Studio Rental Booking",
  offers: {
    "@type": "Offer",
    description: "Hourly studio rental booking service",
  },
} as const;

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
  const [currentUser, listings] = await Promise.all([
    getCurrentUser(),
    getRandomListings(3),
  ]);

  return (
    <main>
      <JsonLd id="home-jsonld" data={[homeJsonLd, localBusinessJsonLd, serviceJsonLd]} />

      {/* 1. Hero —  full-viewport, city search */}
      <Hero />

      {/* 2. How It Works —  3-step flow, orients first-time visitors before showing product */}
      <HowItWorks />

      {/* 3. Studio Showcase —  3-card grid with live data */}
      <StudioShowcase listings={listings} />

      {/* 4. Social Proof —  video + 2-row reviews, trust right after seeing the product */}
      <SocialProof />

      {/* 5. Curated vs Verified —  trust/differentiation reinforcement */}
      <VerifiedVsCurated currentUser={currentUser} />

      {/* 6. Production Concierge —  dark feature card + WhatsApp CTA */}
      <ProductionConcierge />

      {/* 7. FAQ —  objection handling before the final ask */}
      <FAQ />

      {/* 8. For Studio Owners —  CTA */}
      <CTA currentUser={currentUser} />
    </main>
  );
}
