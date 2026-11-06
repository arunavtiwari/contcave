import "../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";

import NotFoundState, { NOT_FOUND_METADATA } from "@/components/ui/NotFoundState";

export const metadata: Metadata = NOT_FOUND_METADATA;

export default function RootNotFound() {
    return (
        <html>
            <body>
                <main className={`${GeistSans.className} flex min-h-screen items-center justify-center`}>
                    <NotFoundState />
                </main>
            </body>
        </html>
    );
}
