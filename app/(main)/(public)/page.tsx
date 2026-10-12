import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getRandomListings from "@/app/actions/getRandomListings";
import CTA from "@/components/landing/CTA";
import FAQ from "@/components/landing/FAQ";
import { homeFaqs } from "@/components/landing/faqData";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import ProductionConcierge from "@/components/landing/ProductionConcierge";
import SocialProof from "@/components/landing/SocialProof";
import StudioShowcase from "@/components/landing/StudioShowcase";
import VerifiedVsCurated from "@/components/landing/VerifiedVsCurated";
import JsonLd from "@/components/seo/JsonLd";
import { coveredCityNames } from "@/lib/listing/cities";
import { coverageArea } from "@/lib/listing/cityPaths";
import { truncateText } from "@/lib/richText";
import {
  absoluteUrl,
  BRAND_NAME,
  BRAND_TITLE,
  DEFAULT_KEYWORDS,
  META_DESCRIPTION_LENGTH,
  OG_IMAGE,
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
} from "@/lib/seo";

const homeDescription = (liveIn: string[]) =>
  truncateText(
    `Book photography, video and podcast studios by the hour ${coverageArea(liveIn)}. Verified spaces with upfront pricing.`,
    META_DESCRIPTION_LENGTH
  );

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${SITE_URL}/#service`,
  name: "Studio Booking Platform",
  description: "Online marketplace for booking photography, video, and event studios across India",
  provider: { "@id": ORGANIZATION_ID },
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

const homeJsonLd = (description: string) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  "@id": `${SITE_URL}/#home`,
  url: SITE_URL,
  name: BRAND_TITLE,
  description,
  isPartOf: { "@id": WEBSITE_ID },
  publisher: { "@id": ORGANIZATION_ID },
  inLanguage: "en-IN",
  primaryImageOfPage: {
    "@type": "ImageObject",
    url: `${SITE_URL}${OG_IMAGE}`,
    width: 1200,
    height: 630,
  },
  about: { "@id": ORGANIZATION_ID },
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
});

export async function generateMetadata(): Promise<Metadata> {
  const description = homeDescription(await coveredCityNames());
  return {
    title: { absolute: BRAND_TITLE },
    description,
    keywords: [...DEFAULT_KEYWORDS],
    alternates: { canonical: "/" },
    openGraph: {
      title: BRAND_TITLE,
      description,
      type: "website",
      url: SITE_URL,
      siteName: BRAND_NAME,
      images: [{ url: absoluteUrl(OG_IMAGE), width: 1200, height: 630, alt: BRAND_NAME }],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: BRAND_TITLE,
      description,
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
}

export default async function Home() {
  const [currentUser, listings, liveIn] = await Promise.all([
    getCurrentUser(),
    getRandomListings(3),
    coveredCityNames(),
  ]);

  return (
    <main>
      <JsonLd id="home-jsonld" data={[homeJsonLd(homeDescription(liveIn)), serviceJsonLd]} />

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
      <FAQ
        items={homeFaqs(liveIn)}
        title={<>Questions? We have <span className="text-muted-foreground italic">Answers</span></>}
        description="Everything you need to know about booking, payments, and studio protocols."
      />

      {/* 8. For Studio Owners —  CTA */}
      <CTA currentUser={currentUser} />
    </main>
  );
}
