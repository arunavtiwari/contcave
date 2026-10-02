import "../styles/globals.css";

import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { type CityEntry, getCityDirectory } from "@/lib/listing/cities";
import { BRAND_NAME } from "@/lib/seo";

export const metadata: Metadata = {
    title: `Page Not Found | ${BRAND_NAME}`,
    description: "The page you're looking for may have moved or no longer exists.",
    robots: { index: false, follow: true },
};

async function loadCities(): Promise<CityEntry[]> {
    try {
        return (await getCityDirectory()).slice(0, 8);
    } catch {
        return [];
    }
}

export default async function RootNotFound() {
    const cities = await loadCities();

    return (
        <html lang="en-IN">
            <body className={GeistSans.className}>
                <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-24 text-center">
                    <Link href="/" aria-label={`${BRAND_NAME} home`}>
                        <Image
                            src="/images/logo/logo_small.png"
                            alt={`${BRAND_NAME} logo`}
                            width={160}
                            height={120}
                            className="rounded-full"
                            priority
                        />
                    </Link>
                    <p className="text-6xl font-semibold">404</p>
                    <div className="flex max-w-xl flex-col gap-3">
                        <h1 className="text-3xl font-bold text-foreground">We couldn&apos;t find the page</h1>
                        <p className="text-muted-foreground">
                            The page you&apos;re looking for may have moved or no longer exists.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        <Link
                            href="/"
                            className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background"
                        >
                            Go to homepage
                        </Link>
                        <Link
                            href="/home"
                            className="rounded-full border border-foreground px-6 py-3 text-sm font-medium text-foreground"
                        >
                            Browse all studios
                        </Link>
                    </div>
                    {cities.length ? (
                        <nav aria-label="Studios by city" className="flex max-w-2xl flex-col gap-3">
                            <p className="text-sm font-medium text-muted-foreground">Studios by city</p>
                            <ul className="flex flex-wrap justify-center gap-2">
                                {cities.map((city) => (
                                    <li key={city.slug}>
                                        <Link
                                            href={`/studios/${city.slug}`}
                                            className="block rounded-full border border-border px-4 py-2 text-sm text-foreground hover:border-foreground"
                                        >
                                            Studios in {city.city}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    ) : (
                        <Link href="/studios" className="text-sm text-foreground underline underline-offset-4">
                            Studios by city
                        </Link>
                    )}
                </main>
            </body>
        </html>
    );
}
