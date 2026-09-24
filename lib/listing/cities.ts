import "server-only";

import { unstable_cache } from "next/cache";

import { kindOf, positive } from "@/lib/listing/seo";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { truncateText } from "@/lib/richText";
import { META_DESCRIPTION_LENGTH } from "@/lib/seo";
import type { FullListing } from "@/types/listing";

const INR = new Intl.NumberFormat("en-IN");

const joinList = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export const citySlug = (city: string) =>
  city
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const cityPath = (city: string) => `/studios/${citySlug(city)}`;

export type CityEntry = {
  city: string;
  slug: string;
  state?: string;
  count: number;
  fromPrice?: number;
  lastModified: string;
};

async function loadCityDirectory(): Promise<CityEntry[]> {
  const ids = await ListingService.getHydratableListingIds({ active: true, status: "VERIFIED" });
  if (ids.length === 0) return [];

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: { locationValue: true, price: true, listingType: true, createdAt: true, updatedAt: true, actualLocation: true },
  });

  const bySlug = new Map<string, CityEntry>();
  for (const listing of listings) {
    const city = listing.locationValue?.trim();
    const slug = city ? citySlug(city) : "";
    if (!city || !slug) continue;

    const modified = (listing.updatedAt ?? listing.createdAt).toISOString();
    const rawState = (listing.actualLocation as { state?: unknown } | null)?.state;
    const state = typeof rawState === "string" && rawState.trim() ? rawState.trim() : undefined;
    const price = listing.listingType === "CURATED" ? undefined : positive(listing.price);

    const entry = bySlug.get(slug);
    if (!entry) {
      bySlug.set(slug, { city, slug, state, count: 1, fromPrice: price, lastModified: modified });
      continue;
    }
    entry.count += 1;
    entry.state ??= state;
    if (price && (!entry.fromPrice || price < entry.fromPrice)) entry.fromPrice = price;
    if (modified > entry.lastModified) entry.lastModified = modified;
  }

  return Array.from(bySlug.values()).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export const getCityDirectory = unstable_cache(loadCityDirectory, ["city-directory"], { revalidate: 3600 });

export async function findCity(slug: string) {
  return (await getCityDirectory()).find((entry) => entry.slug === slug);
}

export function describeCity(entry: CityEntry, listings: FullListing[]) {
  const { city } = entry;
  const place = entry.state && entry.state !== city ? `${city}, ${entry.state}` : city;
  const count = listings.length;
  const studios = count === 1 ? "1 verified studio" : `${count} verified studios`;
  const bookable = listings.filter((listing) => listing.listingType !== "CURATED");
  const prices = bookable
    .map((listing) => positive(listing.price))
    .filter((price): price is number => price !== undefined)
    .sort((a, b) => a - b);

  const kindCounts = new Map<string, number>();
  for (const listing of listings) kindCounts.set(kindOf(listing), (kindCounts.get(kindOf(listing)) ?? 0) + 1);
  const kinds = Array.from(kindCounts.entries()).sort((a, b) => b[1] - a[1]);
  const kindSummary = joinList(kinds.map(([kind, n]) => `${kind} (${n})`));

  const priceClause = prices.length ? `, from ₹${INR.format(prices[0])} per hour` : "";
  const intro = `${studios} you can book by the hour in ${place}${priceClause}.`;

  const description = truncateText(
    `Book ${studios} in ${place} by the hour: ${kindSummary}${priceClause ? `. From ₹${INR.format(prices[0])}/hr` : ""}. Compare size, capacity and amenities on ContCave.`,
    META_DESCRIPTION_LENGTH
  );

  return { intro, description };
}
