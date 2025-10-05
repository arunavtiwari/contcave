import ClientOnly from "@/components/ClientOnly";
import Footer from "@/components/Footer";
import ToastContainerBar from "@/components/ToastContainerBar";
import LoginModal from "@/components/modals/LoginModal";
import RegisterModal from "@/components/modals/RegisterModal";
import RentModal from "@/components/modals/RentModal";
import SearchModal from "@/components/modals/SearchModal";
import Navbar from "@/components/navbar/Navbar";
import { Montserrat } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "../styles/globals.css";
import getCurrentUser from "./actions/getCurrentUser";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsentBanner";
import OwnerRegisterModal from "@/components/modals/OwnerRegisterModal";
import {
  BRAND_DESCRIPTION,
  BRAND_NAME,
  BRAND_TITLE,
  DEFAULT_KEYWORDS,
  OG_IMAGE,
  SITE_URL,
} from "@/lib/seo";

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
    images: [
      {
        url: OG_IMAGE,
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
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}${OG_IMAGE}`,
  },
  sameAs: [
    "https://www.instagram.com/contcave",
    "https://www.linkedin.com/company/contcave",
    "https://x.com/contcave",
  ],
} as const;

const webSiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: BRAND_NAME,
  publisher: { "@id": `${SITE_URL}/#organization` },
  inLanguage: "en",
} as const;

const font = Montserrat({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, webSiteJsonLd]),
          }}
        />
      </head>
      <body className={font.className}>
        <ClientOnly>
          <ToastContainerBar />
          <SearchModal />
          <RegisterModal />
          <LoginModal />
          <OwnerRegisterModal />
          <RentModal />
          <Navbar currentUser={currentUser} />
          <CookieConsent />
        </ClientOnly>
        <div className="min-h-[100vh] pt-[84px]">{children}</div>
        <ScrollToTop />
        <Footer />
      </body>
    </html>
  );
}
