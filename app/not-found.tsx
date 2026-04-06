import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
          We couldn't find the page
        </h1>
        <p className="text-base text-gray-600 sm:text-lg">
          The page you&apos;re looking for may have moved or no longer exists.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
        >
          Go to homepage
        </Link>
        <Link
          href="/listings"
          className="rounded-full border border-gray-900 px-6 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-900 hover:text-white"
        >
          Browse listings
        </Link>
      </div>
    </main>
  );
}
