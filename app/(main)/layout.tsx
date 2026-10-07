import "../../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import getAddons from "@/app/actions/getAddons";
import getAmenities from "@/app/actions/getAmenities";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ConsentAwareTracking from "@/components/analytics/ConsentAwareTracking";
import CookieConsent from "@/components/layout/CookieConsentBanner";
import GlobalScrollFix from "@/components/layout/GlobalScrollFix";
import WhatsAppFloatingButton from "@/components/layout/WhatsAppFloatingButton";
import LoginModal from "@/components/modals/LoginModal";
import OwnerRegisterModal from "@/components/modals/OwnerRegisterModal";
import RegisterModal from "@/components/modals/RegisterModal";
import RentModal from "@/components/modals/RentModal";
import NavbarWrapper from "@/components/navbar/NavbarWrapper";
import GlobalProviders from "@/components/providers/GlobalProviders";
import SpotlightSearch from "@/components/search/SpotlightSearch";
import JsonLd from "@/components/seo/JsonLd";
import ClientOnly from "@/components/ui/ClientOnly";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { Toaster } from "@/components/ui/Toast";
import {
  BRAND_DESCRIPTION,
  BRAND_LOGO,
  BRAND_NAME,
  BRAND_TITLE,
  DEFAULT_KEYWORDS,
  OG_IMAGE,
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
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
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "48x48" },
            { url: "/icon.png", sizes: "192x192", type: "image/png" },
        ],
        shortcut: "/favicon.ico",
        apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
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
        statusBarStyle: "default",
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
    "@id": ORGANIZATION_ID,
    name: BRAND_NAME,
    legalName: "Arkanet Ventures LLP",
    url: SITE_URL,
    description: BRAND_DESCRIPTION,
    logo: BRAND_LOGO,
    foundingDate: "2024",
    founder: [
        {
            "@type": "Person",
            name: "Arunav Tiwari",
            jobTitle: "Chief Executive Officer",
            sameAs: "https://www.linkedin.com/in/art-x/",
        },
        {
            "@type": "Person",
            name: "Shubham Samanta",
            jobTitle: "Chief Technology Officer",
            sameAs: "https://www.linkedin.com/in/sam8239/",
        },
        {
            "@type": "Person",
            name: "Harshita Betala",
            jobTitle: "Chief Product Officer",
            sameAs: "https://www.linkedin.com/in/harshita-betala-ab4b32169/",
        },
    ],
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
    areaServed: {
        "@type": "Country",
        name: "India",
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
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: BRAND_NAME,
    description: BRAND_DESCRIPTION,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-IN",
} as const;



export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const headerList = await headers();
    const nonce = headerList.get("x-nonce") ?? undefined;

    const [amenitiesData, addonsData, currentUser] = await Promise.all([
        getAmenities(),
        getAddons(),
        getCurrentUser(),
    ]);

    return (

        <html lang="en-IN">
            <head>
                <JsonLd
                    id="organization-jsonld"
                    data={[organizationJsonLd, webSiteJsonLd]}
                />
            </head>
            <body className={GeistSans.className}>
                <GlobalProviders>
                    <GlobalScrollFix />
                    <NavbarWrapper />
                    <ConsentAwareTracking nonce={nonce} />
                    <ClientOnly>
                        <Toaster />
                        <SpotlightSearch />
                        <RegisterModal />
                        <LoginModal />
                        <OwnerRegisterModal />
                        <RentModal currentUser={currentUser} predefinedAmenities={amenitiesData} predefinedAddons={addonsData} />
                        <CookieConsent />
                    </ClientOnly>
                    {children}
                    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-3">
                        <WhatsAppFloatingButton />
                        <ScrollToTop />
                    </div>
                </GlobalProviders>
            </body>
        </html>
    );
}
