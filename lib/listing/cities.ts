import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";

import { categoriesOf, MIN_CATEGORY_LISTINGS, STUDIO_CATEGORIES, type StudioCategory } from "@/lib/listing/categories";
import { hourlyPrice } from "@/lib/listing/seo";
import { ListingService } from "@/lib/listing/service";
import prisma from "@/lib/prismadb";
import { CITY_GROUPS } from "@/lib/search/vocabulary";
import type { BreadcrumbItem } from "@/lib/seo";

import { cityCategoryPath, cityPath, citySlug } from "./cityPaths";
import { locationState } from "./utils";

export const STUDIOS_TRAIL: BreadcrumbItem[] = [
  { name: "Home", href: "/" },
  { name: "Studios", href: "/studios" },
];

export const cityTrail = (city: string): BreadcrumbItem[] => [...STUDIOS_TRAIL, { name: city, href: cityPath(city) }];

const MIN_CITY_LISTINGS = 2;

async function queryPublishedListings() {
  const ids = await ListingService.getHydratableListingIds({ active: true, status: "VERIFIED" });
  if (ids.length === 0) return [];

  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      title: true,
      category: true,
      type: true,
      venueTypes: true,
      setFeatures: true,
      locationValue: true,
      imageSrc: true,
      price: true,
      listingType: true,
      carpetArea: true,
      maximumPax: true,
      minimumBookingHours: true,
      instantBooking: true,
      avgReviewRating: true,
      actualLocation: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return listings.map(({ actualLocation, imageSrc, title, createdAt, updatedAt, ...listing }) => ({
    ...listing,
    title: title.trim(),
    imageSrc: imageSrc.slice(0, 1),
    state: locationState(actualLocation),
    modified: (updatedAt ?? createdAt).toISOString(),
  }));
}

export type PublishedListing = Awaited<ReturnType<typeof queryPublishedListings>>[number];

const getPublishedListings = cache(unstable_cache(queryPublishedListings, ["published-listings-v1"], { revalidate: 3600 }));

export type CityEntry = {
  city: string;
  slug: string;
  locationValues: string[];
  state?: string;
  count: number;
  fromPrice?: number;
  lastModified: string;
  categoryCounts: Record<string, number>;
  cities?: string[];
};

const lowerPrice = (current: number | undefined, candidate: number | undefined) =>
  candidate && (!current || candidate < current) ? candidate : current;

function buildCityDirectory(listings: PublishedListing[]): CityEntry[] {
  const bySlug = new Map<string, CityEntry>();
  for (const listing of listings) {
    const city = listing.locationValue?.trim();
    const slug = city ? citySlug(city) : "";
    if (!city || !slug) continue;

    let entry = bySlug.get(slug);
    if (!entry) {
      entry = { city, slug, locationValues: [], count: 0, lastModified: listing.modified, categoryCounts: {} };
      bySlug.set(slug, entry);
    }
    for (const category of categoriesOf(listing)) {
      entry.categoryCounts[category.slug] = (entry.categoryCounts[category.slug] ?? 0) + 1;
    }
    if (!entry.locationValues.includes(listing.locationValue)) entry.locationValues.push(listing.locationValue);
    entry.count += 1;
    entry.state ??= listing.state;
    entry.fromPrice = lowerPrice(entry.fromPrice, hourlyPrice(listing));
    if (listing.modified > entry.lastModified) entry.lastModified = listing.modified;
  }

  return Array.from(bySlug.values()).sort((a, b) => b.count - a.count || a.city.localeCompare(b.city));
}

const sumCounts = (records: Record<string, number>[]) =>
  records.reduce<Record<string, number>>((total, record) => {
    for (const [key, value] of Object.entries(record)) total[key] = (total[key] ?? 0) + value;
    return total;
  }, {});

const mergeMetro = (name: string, members: CityEntry[]): CityEntry => ({
  city: name,
  slug: citySlug(name),
  locationValues: members.flatMap((member) => member.locationValues),
  count: members.reduce((total, member) => total + member.count, 0),
  fromPrice: members.reduce<number | undefined>((lowest, member) => lowerPrice(lowest, member.fromPrice), undefined),
  lastModified: members.reduce((latest, member) => (member.lastModified > latest ? member.lastModified : latest), ""),
  categoryCounts: sumCounts(members.map((member) => member.categoryCounts)),
  cities: members.map((member) => member.city),
});

const metrosOf = (directory: CityEntry[]) =>
  Object.entries(CITY_GROUPS).flatMap(([group, names]) => {
    const slugs = new Set(names.map(citySlug));
    const members = directory.filter((entry) => slugs.has(entry.slug));
    const count = members.reduce((total, member) => total + member.count, 0);
    return members.length > 1 && count >= MIN_CITY_LISTINGS ? [mergeMetro(group, members)] : [];
  });

export const getPlaces = cache(async () => {
  const listings = await getPublishedListings();
  const directory = buildCityDirectory(listings);
  return {
    listings,
    cities: directory.filter((entry) => entry.count >= MIN_CITY_LISTINGS),
    metros: metrosOf(directory),
  };
});

type Places = Awaited<ReturnType<typeof getPlaces>>;

export const allPlaces = ({ metros, cities }: Places) => [...metros, ...cities];

export const placeIn = (places: Places, slug: string) => allPlaces(places).find((entry) => entry.slug === slug);

export const metroIn = ({ metros }: Places, city: string) => {
  const slug = citySlug(city);
  return metros.find((metro) => metro.cities?.some((member) => citySlug(member) === slug));
};

export const listingsIn = ({ listings }: Places, place: CityEntry) =>
  listings.filter((listing) => place.locationValues.includes(listing.locationValue));

export const getCityDirectory = async () => (await getPlaces()).cities;

export const getPlaceDirectory = async () => allPlaces(await getPlaces());

export async function landingPlaceFor(city: string) {
  const places = await getPlaces();
  return places.cities.find((entry) => entry.slug === citySlug(city)) ?? metroIn(places, city);
}

export async function placeIndex() {
  try {
    const places = await getPlaces();
    const inMetro = new Set(places.metros.flatMap((metro) => metro.cities ?? []));
    return {
      all: allPlaces(places),
      covered: [...places.metros, ...places.cities.filter((entry) => !inMetro.has(entry.city))],
    };
  } catch (error) {
    console.error("[CityDirectory] Unavailable:", error instanceof Error ? error.message : error);
    return { all: [], covered: [] };
  }
}

export const coveredCityNames = async () => (await placeIndex()).covered.map((place) => place.city);

export const isCategoryPublished = (entry: CityEntry, category: StudioCategory) =>
  (entry.categoryCounts[category.slug] ?? 0) >= MIN_CATEGORY_LISTINGS;

export const publishedCategories = (entry: CityEntry) =>
  STUDIO_CATEGORIES
    .filter((category) => isCategoryPublished(entry, category))
    .sort((a, b) => entry.categoryCounts[b.slug] - entry.categoryCounts[a.slug]);

export const categoryLink = (place: CityEntry, category: StudioCategory) => ({
  label: `${category.name} in ${place.city}`,
  href: cityCategoryPath(place.city, category),
});

export function popularSearches(places: CityEntry[], limit: number) {
  const rounds = places.map(publishedCategories);
  const depth = Math.max(0, ...rounds.map((categories) => categories.length));
  return Array.from({ length: depth }, (_, rank) =>
    places.flatMap((place, index) => {
      const category = rounds[index][rank];
      return category ? [categoryLink(place, category)] : [];
    })
  )
    .flat()
    .slice(0, limit);
}
