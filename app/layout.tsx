import "../styles/globals.css";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";

import ClientOnly from "@/components/ClientOnly";
import CookieConsent from "@/components/CookieConsentBanner";
import Footer from "@/components/Footer";
import LoginModal from "@/components/modals/LoginModal";
import OwnerRegisterModal from "@/components/modals/OwnerRegisterModal";
import RegisterModal from "@/components/modals/RegisterModal";
import RentModal from "@/components/modals/RentModal";
import SearchModal from "@/components/modals/SearchModal";
import Navbar from "@/components/navbar/Navbar";
import ScrollToTop from "@/components/ScrollToTop";
import ToastContainerBar from "@/components/ToastContainerBar";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TITLE,
  DEFAULT_KEYWORDS,
  OG_IMAGE,
  SITE_URL,
} from "@/lib/seo";


import getCurrentUser from "./actions/getCurrentUser";

export const dynamic = "force-dynamic";


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: BRAND_TITLE,
    template: `%s | ${BRAND_NAME}`,
  },
  description: BRAND_DESCRIPTION,
  keywords: [...DEFAULT_KEYWORDS],
  authors: [{ name: BRAND_NAME }],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/assets/logo_small.png",
    apple: {
      url: "/assets/logo_small.png",
    },
  },
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    url: SITE_URL,
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
    locale: "en_IN",
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: BRAND_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ContCave",
    title: BRAND_TITLE,
    description: BRAND_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: BRAND_NAME,
  legalName: "Arkanet Ventures LLP",
  url: SITE_URL,
  description: BRAND_DESCRIPTION,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}${OG_IMAGE}`,
    width: 1200,
    height: 630,
  },
  foundingDate: "2024",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Service",
    email: "info@contcave.com",
    availableLanguage: ["English", "Hindi"],
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/contcave",
    "https://www.linkedin.com/company/contcave",
    "https://x.com/contcave",
  ],
} as const;

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${SITE_URL}/#localbusiness`,
  name: BRAND_NAME,
  legalName: "Arkanet Ventures LLP",
  url: SITE_URL,
  description: BRAND_DESCRIPTION,
  image: `${SITE_URL}${OG_IMAGE}`,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}${OG_IMAGE}`,
    width: 1200,
    height: 630,
  },
  address: {
    "@type": "PostalAddress",
    addressCountry: "IN",
    addressLocality: "India",
  },
  areaServed: {
    "@type": "Country",
    name: "India",
  },
  priceRange: "$$",
  telephone: "+91",
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

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: BRAND_NAME,
  description: BRAND_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#localbusiness` },
  inLanguage: "en-IN",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/home?locationValue={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
} as const;

const font = Montserrat({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let currentUser = null;
  try {
    currentUser = await getCurrentUser();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[RootLayout] Error getting current user:', error);
    }
  }

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, localBusinessJsonLd, webSiteJsonLd, serviceJsonLd]),
          }}
        />
      </head>
      <body className={font.className}>
        <Navbar currentUser={currentUser} />
        <ClientOnly>
          <ToastContainerBar />
          <SearchModal />
          <RegisterModal />
          <LoginModal />
          <OwnerRegisterModal />
          <RentModal />
          <CookieConsent />
        </ClientOnly>
        <div className="min-h-screen pt-[84px]">{children}</div>
        <ScrollToTop />
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
