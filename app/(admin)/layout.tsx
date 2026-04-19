import "../../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Metadata, Viewport } from "next";
import React from "react";

import ClientOnly from "@/components/ClientOnly";
import ToastContainerBar from "@/components/ToastContainerBar";
import { BRAND_NAME, SITE_URL } from "@/lib/seo";

// Using Geist instead of Montserrat for consistency with the main app


export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: 'Admin Portal',
        template: `%s | Admin | ${BRAND_NAME}`
    },
    description: 'Secure Management Portal',
    robots: {
        index: false,
        follow: false
    },
    icons: {
        icon: '/images/logo/logo-og.png',
        shortcut: '/images/logo/logo-og.png',
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#FFFFFF",
};


export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={GeistSans.className}>
                <ClientOnly>
                    <ToastContainerBar />
                </ClientOnly>
                {children}
            </body>
        </html>
    );
}
