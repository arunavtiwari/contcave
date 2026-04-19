import type { Metadata } from "next";
import React from "react";

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

import AboutHero from "@/components/about/AboutHero";
import AboutContent from "@/components/about/AboutContent";

const DESCRIPTION =
  "Learn how ContCave empowers creatives with a curated network of production-ready studios, industry partners, and hands-on support." as const;

export const metadata: Metadata = {
  title: "About Us",
  description: DESCRIPTION,
  keywords: [
    "ContCave about",
    "studio marketplace",
    "creative platform India",
    "Arkanet Ventures",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us",
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: BRAND_NAME,
    type: "website",
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: `About ${BRAND_NAME}`,
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us",
    description: DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [`${SITE_URL}${OG_IMAGE}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

const About = async () => {
  return (
    <main className="bg-background">
      <AboutHero />
      <Container>
        <AboutContent />
      </Container>
    </main>
  );
};

export default About;
