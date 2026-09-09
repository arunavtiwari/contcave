import "../../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { Metadata, Viewport } from "next";
import React from "react";

import ClientOnly from "@/components/shared/ClientOnly";
import ToastContainerBar from "@/components/shared/ToastContainerBar";
import { BRAND_NAME, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: `${BRAND_NAME} Admin`,
        template: `%s | ${BRAND_NAME} Admin`
    },
    description: 'Secure Management Portal',
    robots: {
        index: false,
        follow: false
    },
    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/apple-icon.png",
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
