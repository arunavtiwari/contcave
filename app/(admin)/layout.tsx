import "../../styles/globals.css";

import { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import React from "react";

import ClientOnly from "@/components/ClientOnly";
import ToastContainerBar from "@/components/ToastContainerBar";
import { BRAND_NAME, SITE_URL } from "@/lib/seo";

const font = Montserrat({ subsets: ["latin"] });

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
    themeColor: "#111827",
};

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={font.className}>
                <ClientOnly>
                    <ToastContainerBar />
                </ClientOnly>
                {children}
            </body>
        </html>
    );
}
