import type { Metadata } from "next";
import Image from "next/image";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

export const dynamic = 'force-static';
export const dynamicParams = false;

export const metadata: Metadata = {
    title: "Page Not Found",
    description: "The page you're looking for may have moved or no longer exists.",
    robots: { index: false, follow: true },
};

export default function NotFound() {
    return (
        <main className="flex flex-col items-center justify-center gap-6 px-6 py-24 text-center ">
            <div className="flex flex-col items-center gap-4">
                <Image
                    src="/images/logo/logo_small.png"
                    alt="ContCave logo"
                    width={160}
                    height={120}
                    className="rounded-full"
                    priority
                />
                <p className="text-6xl font-semibold">
                    404
                </p>
            </div>
            <div className="flex max-w-xl flex-col gap-3">
                <Heading
                    title="We couldn't find the page"
                    subtitle="The page you're looking for may have moved or no longer exists."
                    variant="h1"
                    center
                />
            </div>
            <div className="flex flex-wrap justify-center gap-3">
                <Button
                    label="Go to homepage"
                    href="/"
                    variant="default"
                    rounded
                    fit
                />
                <Button
                    label="Browse listings"
                    href="/listings"
                    variant="outline"
                    rounded
                    fit
                />
            </div>
        </main>
    );
}
