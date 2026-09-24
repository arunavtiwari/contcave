import "server-only";

import { unstable_cache } from "next/cache";

import { GST_RATE } from "@/constants/gst";
import { durationText, joinList } from "@/lib/listing/faq";
import { kindOf, minimumBookingHours, positive } from "@/lib/listing/seo";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { truncateText } from "@/lib/richText";
import { type FaqItem, META_DESCRIPTION_LENGTH } from "@/lib/seo";
import type { FullListing } from "@/types/listing";

const INR = new Intl.NumberFormat("en-IN");

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

const median = (sorted: number[]) => {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

const topBy = (listings: FullListing[], value: (listing: FullListing) => number | undefined, limit = 3) =>
  listings
    .map((listing) => ({ listing, value: value(listing) }))
    .filter((row): row is { listing: FullListing; value: number } => row.value !== undefined)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

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

  const faq: FaqItem[] = [];
  const gst = `${Math.round(GST_RATE * 100)}% GST`;

  if (prices.length > 1) {
    faq.push({
      question: `How much does it cost to rent a studio in ${city}?`,
      answer: `Studios in ${city} on ContCave cost ₹${INR.format(prices[0])}–₹${INR.format(prices[prices.length - 1])} per hour, with a median of ₹${INR.format(median(prices))}, plus ${gst}.`,
    });
  } else if (prices.length === 1) {
    faq.push({
      question: `How much does it cost to rent a studio in ${city}?`,
      answer: `The studio you can book online in ${city} costs ₹${INR.format(prices[0])} per hour, plus ${gst}.`,
    });
  }

  faq.push({
    question: `How many studios can I book in ${city}?`,
    answer: `ContCave lists ${studios} in ${city}: ${kindSummary}.`,
  });

  if (bookable.length) {
    const minimums = bookable.map(minimumBookingHours).sort((a, b) => a - b);
    const low = minimums[0];
    const high = minimums[minimums.length - 1];
    faq.push({
      question: `Can I rent a studio in ${city} by the hour?`,
      answer: `Yes. Every studio on ContCave is booked by the hour. In ${city} the minimum booking ${low === high ? `is ${durationText(low)}` : `ranges from ${durationText(low)} to ${durationText(high)}`}.`,
    });

    const instant = bookable.filter((listing) => listing.instantBooking);
    const names = instant.slice(0, 5).map((listing) => listing.title.trim());
    faq.push({
      question: `Which studios in ${city} can I book instantly?`,
      answer: instant.length
        ? `${instant.length === bookable.length ? "All of them" : `${instant.length} of the ${bookable.length} you can book online`}: ${joinList(names)}${instant.length > names.length ? " and more" : ""}. The rest take booking requests, which hosts have 24 hours to accept.`
        : `None right now. Studios in ${city} take booking requests: you pay when you send one and the host has 24 hours to accept, or your payment is refunded.`,
    });
  }

  const largest = topBy(listings, (listing) => positive(listing.carpetArea));
  if (largest.length) {
    faq.push({
      question: `What are the biggest studios in ${city}?`,
      answer: `By floor area: ${joinList(largest.map(({ listing, value }) => `${listing.title.trim()} (${INR.format(value)} sq ft)`))}.`,
    });
  }

  const roomiest = topBy(listings, (listing) => positive(listing.maximumPax));
  if (roomiest.length) {
    faq.push({
      question: `Which studios in ${city} fit the biggest crews?`,
      answer: `${joinList(roomiest.map(({ listing, value }) => `${listing.title.trim()} (up to ${value} people)`))}.`,
    });
  }

  const description = truncateText(
    `Book ${studios} in ${place} by the hour: ${kindSummary}${priceClause ? `. From ₹${INR.format(prices[0])}/hr` : ""}. Compare size, capacity and amenities on ContCave.`,
    META_DESCRIPTION_LENGTH
  );

  return { intro, description, faq };
}
