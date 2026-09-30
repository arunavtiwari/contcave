import "server-only";

import { unstable_cache } from "next/cache";

import { categoriesOf, MIN_CATEGORY_LISTINGS, STUDIO_CATEGORIES, type StudioCategory } from "@/lib/listing/categories";
import { kindOf, positive } from "@/lib/listing/seo";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { truncateText } from "@/lib/richText";
import { type BreadcrumbItem, META_DESCRIPTION_LENGTH } from "@/lib/seo";
import { formatINR } from "@/lib/utils";
import type { FullListing } from "@/types/listing";

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

export const STUDIOS_TRAIL: BreadcrumbItem[] = [
  { name: "Home", href: "/" },
  { name: "Studios", href: "/studios" },
];

export const cityTrail = (city: string): BreadcrumbItem[] => [...STUDIOS_TRAIL, { name: city, href: cityPath(city) }];

export const cityCategoryPath = (city: string, category: { slug: string }) =>
  `${cityPath(city)}/${category.slug}`;

export type CityEntry = {
  city: string;
  slug: string;
  state?: string;
  count: number;
  fromPrice?: number;
  lastModified: string;
  categoryCounts: Record<string, number>;
};

async function loadCityDirectory(): Promise<CityEntry[]> {
  const ids = await ListingService.getHydratableListingIds({ active: true, status: "VERIFIED" });
  if (ids.length === 0) return [];

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: {
      locationValue: true,
      price: true,
      listingType: true,
      createdAt: true,
      updatedAt: true,
      actualLocation: true,
      type: true,
      venueTypes: true,
      category: true,
    },
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

    let entry = bySlug.get(slug);
    if (!entry) {
      entry = { city, slug, state, count: 0, fromPrice: price, lastModified: modified, categoryCounts: {} };
      bySlug.set(slug, entry);
    }
    for (const category of categoriesOf(listing)) {
      entry.categoryCounts[category.slug] = (entry.categoryCounts[category.slug] ?? 0) + 1;
    }
    entry.count += 1;
    entry.state ??= state;
    if (price && (!entry.fromPrice || price < entry.fromPrice)) entry.fromPrice = price;
    if (modified > entry.lastModified) entry.lastModified = modified;
  }

  return Array.from(bySlug.values()).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

export const MIN_CITY_LISTINGS = 2;

const loadPublishedCities = async () =>
  (await loadCityDirectory()).filter((entry) => entry.count >= MIN_CITY_LISTINGS);

export const getCityDirectory = unstable_cache(loadPublishedCities, ["city-directory-v3"], { revalidate: 3600 });

export const publishedCategories = (entry: CityEntry) =>
  STUDIO_CATEGORIES
    .filter((category) => (entry.categoryCounts[category.slug] ?? 0) >= MIN_CATEGORY_LISTINGS)
    .sort((a, b) => entry.categoryCounts[b.slug] - entry.categoryCounts[a.slug]);

export const categoryLinks = (entry: CityEntry, categories: StudioCategory[] = publishedCategories(entry)) =>
  categories.map((category) => {
    const count = entry.categoryCounts[category.slug] ?? 0;
    return {
      href: cityCategoryPath(entry.city, category),
      label: category.name,
      description: `${count} ${count === 1 ? "studio" : "studios"}`,
    };
  });

export async function findCity(slug: string) {
  return (await getCityDirectory()).find((entry) => entry.slug === slug);
}

const placeOf = (entry: CityEntry) =>
  entry.state && entry.state !== entry.city ? `${entry.city}, ${entry.state}` : entry.city;

const numbers = (values: (number | undefined)[]) => values.filter((n): n is number => n !== undefined);

const range = (values: number[]) =>
  values.length ? ([Math.min(...values), Math.max(...values)] as const) : undefined;

const hourlyPrices = (listings: FullListing[]) =>
  range(numbers(listings.filter((listing) => listing.listingType !== "CURATED").map((listing) => positive(listing.price))));

const studiosLabel = (count: number, noun = "studio") => `${count} verified ${noun}${count === 1 ? "" : "s"}`;

export function describeCity(entry: CityEntry, listings: FullListing[]) {
  const prices = hourlyPrices(listings);

  const kindCounts = new Map<string, number>();
  for (const listing of listings) kindCounts.set(kindOf(listing), (kindCounts.get(kindOf(listing)) ?? 0) + 1);
  const kindSummary = joinList(
    Array.from(kindCounts.entries()).sort((a, b) => b[1] - a[1]).map(([kind, n]) => `${kind} (${n})`)
  );

  return {
    description: truncateText(
      `Book ${studiosLabel(listings.length)} in ${placeOf(entry)} by the hour: ${kindSummary}${prices ? `. From ${formatINR(prices[0])}/hr` : ""}. Compare size, capacity and amenities on ContCave.`,
      META_DESCRIPTION_LENGTH
    ),
  };
}

export function describeCityCategory(entry: CityEntry, category: StudioCategory, listings: FullListing[]) {
  const prices = hourlyPrices(listings);
  return {
    description: truncateText(
      `Book ${studiosLabel(listings.length, category.noun)} in ${entry.city} by the hour${prices ? `, from ${formatINR(prices[0])}/hr` : ""}. Compare size, capacity, amenities and reviews on ContCave.`,
      META_DESCRIPTION_LENGTH
    ),
  };
}
