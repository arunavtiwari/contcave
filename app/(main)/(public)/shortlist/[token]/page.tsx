import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LuArrowUpRight, LuBadgeCheck, LuCalendarDays, LuMapPin, LuMaximize2, LuUsers } from "react-icons/lu";

import Container from "@/components/layout/Container";
import PublicPageShell from "@/components/layout/PublicPageShell";
import { listingPath } from "@/lib/listing/seo";
import prisma from "@/lib/prismadb";

/** A private share link: never indexed, never cached across visitors. */
export const metadata: Metadata = {
    title: "Your studio shortlist",
    description: "Studios picked for your shoot by ContCave.",
    robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TOKEN = /^[A-Za-z0-9_-]{8,32}$/;

const inr = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

const prettyDate = (dateKey: string) =>
    new Date(`${dateKey}T00:00:00.000Z`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

async function loadShortlist(token: string) {
    if (!TOKEN.test(token)) return null;
    const shortlist = await prisma.conciergeShortlist.findUnique({ where: { token } });
    if (!shortlist || shortlist.expiresAt < new Date()) return null;

    const listings = await prisma.listing.findMany({
        // A studio taken down since the link was made simply drops off the page.
        where: {
            id: { in: shortlist.listingIds },
            active: true,
            status: "VERIFIED",
            // A field that was never set is not equal to null in MongoDB, so match both.
            OR: [{ archivedAt: null }, { archivedAt: { isSet: false } }],
        },
        select: {
            id: true,
            slug: true,
            title: true,
            imageSrc: true,
            locationValue: true,
            price: true,
            priceRangeMin: true,
            priceRangeMax: true,
            maximumPax: true,
            carpetArea: true,
            listingType: true,
        },
    });
    const order = new Map(shortlist.listingIds.map((id, index) => [id, index]));
    listings.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { shortlist, listings };
}

export default async function ShortlistPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const data = await loadShortlist(token);
    if (!data) notFound();
    const { shortlist, listings } = data;

    return (
        <PublicPageShell>
            <Container>
                <header className="max-w-2xl py-10 md:py-14">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Shortlist</p>
                    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                        {listings.length} {listings.length === 1 ? "studio" : "studios"} picked for your shoot
                    </h1>
                    {shortlist.note && <p className="mt-3 text-base leading-7 text-muted-foreground">{shortlist.note}</p>}
                    {shortlist.date && (
                        <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-foreground">
                            <LuCalendarDays size={15} className="text-muted-foreground" aria-hidden />
                            {prettyDate(shortlist.date)}
                        </p>
                    )}
                </header>

                {listings.length === 0 ? (
                    <p className="pb-20 text-muted-foreground">These studios are no longer listed. Start a new search to see what&apos;s available now.</p>
                ) : (
                    <ol className="grid gap-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
                        {listings.map((listing, index) => {
                            const curated = listing.listingType === "CURATED";
                            const price = listing.price
                                ? inr(listing.price)
                                : listing.priceRangeMin && listing.priceRangeMax
                                    ? `${inr(listing.priceRangeMin)}–${inr(listing.priceRangeMax)}`
                                    : null;
                            return (
                                <li key={listing.id}>
                                    <Link
                                        href={listingPath(listing)}
                                        className="group block overflow-hidden rounded-2xl border border-border bg-background transition-colors hover:border-foreground focus-visible:outline-none focus-visible:border-foreground"
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                                            {listing.imageSrc[0] ? (
                                                <Image
                                                    src={listing.imageSrc[0]}
                                                    alt={listing.title}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
                                                    priority={index < 3}
                                                />
                                            ) : null}
                                            <span className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/95 text-xs font-semibold tabular-nums text-foreground backdrop-blur">
                                                {index + 1}
                                            </span>
                                            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground backdrop-blur">
                                                {!curated && <LuBadgeCheck size={12} aria-hidden />}
                                                {curated ? "Curated" : "Verified"}
                                            </span>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <h2 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">{listing.title}</h2>
                                                <LuArrowUpRight size={18} className="mt-0.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden />
                                            </div>
                                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <LuMapPin size={13} aria-hidden />
                                                {listing.locationValue}
                                            </p>
                                            <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-4">
                                                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                                    {listing.maximumPax ? (
                                                        <li className="flex items-center gap-1.5"><LuUsers size={12} aria-hidden />Up to {listing.maximumPax}</li>
                                                    ) : null}
                                                    {listing.carpetArea ? (
                                                        <li className="flex items-center gap-1.5"><LuMaximize2 size={12} aria-hidden />{listing.carpetArea.toLocaleString("en-IN")} sq ft</li>
                                                    ) : null}
                                                </ul>
                                                {price && (
                                                    <p className="shrink-0 text-base font-semibold tabular-nums text-foreground">
                                                        {price}
                                                        <span className="text-sm font-normal text-muted-foreground">/hr</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ol>
                )}
            </Container>
        </PublicPageShell>
    );
}
