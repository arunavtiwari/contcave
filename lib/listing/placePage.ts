import "server-only";

import type { Metadata } from "next";
import { cache } from "react";

import { CANCELLATION_POLICY_SUMMARY } from "@/constants/cancellation";
import { GST_PERCENT } from "@/constants/gst";
import { minimumBookingMinutes } from "@/lib/booking/dayAvailability";
import { findCategory, matchesCategory, type StudioCategory } from "@/lib/listing/categories";
import {
  allPlaces,
  categoryLink,
  type CityEntry,
  cityTrail,
  getPlaces,
  isCategoryPublished,
  listingsIn,
  metroIn,
  placeIn,
  publishedCategories,
  type PublishedListing,
} from "@/lib/listing/cities";
import { cityCategoryPath, cityPath, cityWithState } from "@/lib/listing/cityPaths";
import { collectionMetadata, hourlyPrice, UNPUBLISHED_COLLECTION_METADATA, withCityAlias } from "@/lib/listing/seo";
import { pagePath, pageTitle } from "@/lib/pagination";
import { truncateText } from "@/lib/richText";
import { type BreadcrumbItem, META_DESCRIPTION_LENGTH } from "@/lib/seo";
import { isAre, joinList, plural, pluralize, pluralWord } from "@/lib/strings";
import { formatINR, formatNumber } from "@/lib/utils";
import type { Faq } from "@/types/faq";

const HERO_IMAGES = 3;
const DESCRIBED_CATEGORIES = 2;

type Scope = { name: string; noun: string };

type PlaceLink = { label: string; href: string };

type PlaceLinkGroup = { title: string; links: PlaceLink[] };

type PlaceFact = { value: string; label: string };

type Places = Awaited<ReturnType<typeof getPlaces>>;

const scopeOf = (category?: StudioCategory): Scope =>
  category ? { name: category.name, noun: category.noun } : { name: "Studios", noun: "studio" };

const isVerified = (studio: PublishedListing) => studio.listingType !== "CURATED";

const largestBy = (studios: PublishedListing[], measure: (studio: PublishedListing) => number | null) =>
  studios
    .filter((studio) => (measure(studio) ?? 0) > 0)
    .sort((a, b) => (measure(b) ?? 0) - (measure(a) ?? 0))[0];

function placeStats(studios: PublishedListing[]) {
  const verified = studios.filter(isVerified);
  const prices = verified
    .map(hourlyPrice)
    .filter((price): price is number => price !== undefined)
    .sort((a, b) => a - b);
  const hours = verified.map((studio) => minimumBookingMinutes(studio.minimumBookingHours) / 60);
  const areas = studios.map((studio) => studio.carpetArea ?? 0).filter((area) => area > 0);

  return {
    count: studios.length,
    verified: verified.length,
    curated: studios.length - verified.length,
    instant: verified.filter((studio) => studio.instantBooking).length,
    fromPrice: prices[0],
    medianPrice: prices.length >= 3 ? prices[Math.floor((prices.length - 1) / 2)] : undefined,
    minHours: hours.length ? Math.min(...hours) : 0,
    maxHours: hours.length ? Math.max(...hours) : 0,
    smallestArea: areas.length ? Math.min(...areas) : undefined,
    largest: largestBy(studios, (studio) => studio.carpetArea),
    roomiest: largestBy(studios, (studio) => studio.maximumPax),
  };
}

type PlaceStats = ReturnType<typeof placeStats>;

const where = (entry: CityEntry, places: string) => `${entry.cities ? "across" : "in"} ${places}`;

function sizeSentence({ smallestArea, largest, roomiest }: PlaceStats) {
  const largestArea = largest?.carpetArea;
  const people = roomiest?.maximumPax ? `hold up to ${formatNumber(roomiest.maximumPax)} people` : "";
  if (largestArea && smallestArea && smallestArea < largestArea) {
    const range = `Spaces range from ${formatNumber(smallestArea)} to ${formatNumber(largestArea)} sq ft`;
    return people ? `${range}, and the biggest ${people}.` : `${range}.`;
  }
  if (largestArea) return `The largest space is ${formatNumber(largestArea)} sq ft.`;
  return people ? `The biggest ${people}.` : "";
}

function verificationSentence({ count, verified, curated }: PlaceStats) {
  if (!curated) return `All ${count} are verified listings, confirmed by their owners.`;
  if (!verified) return "All of them are curated listings with indicative pricing.";
  return `${verified} ${isAre(verified)} verified by their owners and ${curated} ${isAre(curated)} curated by ContCave.`;
}

function pageCopy(entry: CityEntry, category: StudioCategory | undefined, { name, noun }: Scope, stats: PlaceStats) {
  const price = stats.fromPrice ? ` from ${formatINR(stats.fromPrice)}/hr` : "";
  const onRent = `${name} on Rent in ${entry.city}`;
  const inPlace = `${name} in ${entry.city}`;
  const badge = entry.cities ? joinList(entry.cities) : cityWithState(entry.city, entry.state);
  const described = publishedCategories(entry).slice(0, DESCRIBED_CATEGORIES).map((top) => top.name.toLowerCase());
  const compare = category || !described.length
    ? "Compare size, capacity and hourly rates, then book online on ContCave."
    : `Compare ${joinList(described)} by size, capacity and price on ContCave.`;
  const aliased = entry.cities ? joinList(entry.cities.map(withCityAlias)) : withCityAlias(entry.city);
  const rates = stats.fromPrice ? `, with rates from ${formatINR(stats.fromPrice)}/hr before ${GST_PERCENT}% GST` : "";

  return {
    titles: [`Book ${onRent}${price}`, `Book ${inPlace}${price}`, `Book ${onRent}`, `Book ${inPlace}`, inPlace],
    badge,
    heading: { lead: `Book ${name}`, place: `in ${entry.city}` },
    browse: `Browse ${pluralize(stats.count, noun)}`,
    noun: plural(noun),
    description: truncateText(
      `Book ${pluralize(stats.count, noun)} on rent ${where(entry, badge)} by the hour${price ? `,${price}` : ""}. ${compare}`,
      META_DESCRIPTION_LENGTH
    ),
    intro: [
      `ContCave lists ${pluralize(stats.count, noun)} ${where(entry, aliased)} that you can book by the hour${rates}.`,
      sizeSentence(stats),
      verificationSentence(stats),
    ].filter(Boolean).join(" "),
    instantNote: stats.instant
      ? `${pluralize(stats.instant, noun)} here confirm the moment you pay; the rest confirm once the host accepts.`
      : "Pick a slot and pay online; the host confirms your request.",
  };
}

function factsOf(stats: PlaceStats): PlaceFact[] {
  const facts: (PlaceFact | undefined)[] = [
    { value: formatNumber(stats.count), label: pluralWord(stats.count, "Space") },
    stats.fromPrice ? { value: formatINR(stats.fromPrice), label: "From per hour" } : undefined,
    stats.largest?.carpetArea ? { value: formatNumber(stats.largest.carpetArea), label: "Sq ft, largest" } : undefined,
    stats.roomiest?.maximumPax ? { value: formatNumber(stats.roomiest.maximumPax), label: "People, max" } : undefined,
    stats.instant ? { value: formatNumber(stats.instant), label: "Instant book" } : undefined,
  ];
  return facts.filter((fact): fact is PlaceFact => Boolean(fact)).slice(0, 4);
}

function confirmationSentence({ verified, instant }: PlaceStats) {
  if (!instant) return "Each booking is confirmed once the host accepts your request.";
  if (instant < verified) return `${instant} of them confirm instantly; the rest confirm once the host accepts your request.`;
  return verified === 1 ? "It confirms instantly." : "All of them confirm instantly.";
}

function hourlyAnswer(noun: string, stats: PlaceStats) {
  const { verified, count, curated, minHours, maxHours } = stats;
  const subject = verified === count
    ? `Every ${noun} here is`
    : `${pluralize(verified, `verified ${noun}`)} ${isAre(verified)}`;
  const hours = minHours === maxHours
    ? `The minimum booking is ${formatNumber(minHours)} ${pluralWord(minHours, "hour")}.`
    : `Minimum bookings range from ${formatNumber(minHours)} to ${formatNumber(maxHours)} hours.`;
  const curatedNote = curated
    ? ` The ${pluralize(curated, "curated listing")} ${isAre(curated)} booked through the ContCave team on WhatsApp.`
    : "";
  return `Yes. ${subject} booked and paid for online by the hour. ${hours} ${confirmationSentence(stats)}${curatedNote}`;
}

function largestAnswer({ largest, roomiest }: PlaceStats) {
  if (!largest?.carpetArea) return "";
  const lead = `${largest.title} is the largest at ${formatNumber(largest.carpetArea)} sq ft`;
  if (roomiest && roomiest.id !== largest.id) {
    return `${lead}, and ${roomiest.title} holds the most people (up to ${formatNumber(roomiest.maximumPax ?? 0)}).`;
  }
  return largest.maximumPax ? `${lead} and holds up to ${formatNumber(largest.maximumPax)} people.` : `${lead}.`;
}

function verificationAnswer(noun: string, { verified, curated }: PlaceStats) {
  const owners = "the owner confirms the details, pricing and photos, and the ContCave team approves the listing before it goes live";
  const compiled = "ContCave compiled from public information, with indicative pricing until the studio confirms it";
  if (!curated) return `Yes. Every ${noun} here is a verified listing: ${owners}.`;
  if (!verified) return `Not yet. These are curated listings that ${compiled}.`;
  return `${verified} ${isAre(verified)} verified listings: ${owners}. The other ${curated} ${isAre(curated)} curated listings that ${compiled}.`;
}

function citySpread(studios: PublishedListing[]) {
  const counts = new Map<string, number>();
  for (const studio of studios) {
    const city = studio.locationValue.trim();
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return joinList(
    Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([city, count]) => `${count} in ${withCityAlias(city)}`)
  );
}

function placeFaqs(entry: CityEntry, { noun }: Scope, studios: PublishedListing[], stats: PlaceStats): Faq[] {
  const place = entry.city;
  const largest = largestAnswer(stats);
  const faqs: (Faq | undefined)[] = [
    stats.fromPrice ? {
      question: `How much does it cost to rent a ${noun} in ${place}?`,
      answer: `Verified ${plural(noun)} in ${place} start at ${formatINR(stats.fromPrice)}/hr${stats.medianPrice ? `, and half of them cost ${formatINR(stats.medianPrice)}/hr or less` : ""}. Rates are listed before ${GST_PERCENT}% GST, which is added at checkout, and each studio page shows its exact rate and minimum booking.`,
    } : undefined,
    stats.verified ? { question: `Can I book a ${noun} in ${place} by the hour?`, answer: hourlyAnswer(noun, stats) } : undefined,
    largest ? { question: `What is the largest ${noun} in ${place}?`, answer: largest } : undefined,
    { question: `Are the ${plural(noun)} on ContCave verified?`, answer: verificationAnswer(noun, stats) },
    entry.cities ? { question: `Which cities in ${place} have ${plural(noun)}?`, answer: `ContCave lists ${citySpread(studios)}.` } : undefined,
    { question: "What is the cancellation policy?", answer: CANCELLATION_POLICY_SUMMARY },
  ];
  return faqs.filter((faq): faq is Faq => Boolean(faq));
}

function linkGroups(entry: CityEntry, category: StudioCategory | undefined, { name }: Scope, places: Places): PlaceLinkGroup[] {
  const linkTo = (place: CityEntry): PlaceLink[] => {
    if (!category) return [{ label: `${name} in ${place.city}`, href: cityPath(place.city) }];
    return isCategoryPublished(place, category) ? [categoryLink(place, category)] : [];
  };

  const metro = entry.cities ? undefined : metroIn(places, entry.city);
  const members = entry.cities ?? metro?.cities ?? [];
  const nearby = [
    ...(metro ? [metro] : []),
    ...places.cities.filter((place) => place.slug !== entry.slug && members.includes(place.city)),
  ];
  const nearbySlugs = new Set([entry.slug, ...nearby.map((place) => place.slug)]);
  const types = [
    ...(category ? [{ label: `All studios in ${entry.city}`, href: cityPath(entry.city) }] : []),
    ...publishedCategories(entry)
      .filter((published) => published.slug !== category?.slug)
      .map((published) => ({ label: published.name, href: cityCategoryPath(entry.city, published) })),
  ];

  return [
    { title: category ? `More in ${entry.city}` : `Studio types in ${entry.city}`, links: types },
    { title: entry.cities ? `Cities in ${entry.city}` : `Around ${entry.city}`, links: nearby.flatMap(linkTo) },
    { title: "Other cities", links: allPlaces(places).filter((place) => !nearbySlugs.has(place.slug)).flatMap(linkTo) },
  ].filter((group) => group.links.length > 0);
}

const heroStudios = (studios: PublishedListing[]) =>
  studios
    .filter((studio) => studio.imageSrc[0])
    .sort((a, b) => Number(!isVerified(a)) - Number(!isVerified(b)) || (b.avgReviewRating ?? 0) - (a.avgReviewRating ?? 0))
    .slice(0, HERO_IMAGES);

function buildPlacePage(places: Places, entry: CityEntry, category?: StudioCategory) {
  const scope = scopeOf(category);
  const inPlace = listingsIn(places, entry);
  const studios = category ? inPlace.filter((studio) => matchesCategory(studio, category)) : inPlace;
  const stats = placeStats(studios);
  const trail: BreadcrumbItem[] = [...cityTrail(entry.city), ...(category ? [{ name: category.name }] : [])];

  return {
    entry,
    category,
    path: category ? cityCategoryPath(entry.city, category) : cityPath(entry.city),
    trail,
    copy: pageCopy(entry, category, scope, stats),
    facts: factsOf(stats),
    faqs: placeFaqs(entry, scope, studios, stats),
    links: linkGroups(entry, category, scope, places),
    heroStudios: heroStudios(studios),
  };
}

export type PlacePage = ReturnType<typeof buildPlacePage>;

type PlaceRoute = { page: PlacePage } | { redirect: string } | null;

export const loadPlaceRoute = cache(async (slug: string, categorySlug: string | null): Promise<PlaceRoute> => {
  const category = categorySlug ? findCategory(categorySlug) : undefined;
  if (categorySlug && !category) return null;

  const places = await getPlaces();
  const place = placeIn(places, slug);
  if (place && (!category || isCategoryPublished(place, category))) return { page: buildPlacePage(places, place, category) };

  const metro = metroIn(places, slug);
  if (category && metro && isCategoryPublished(metro, category)) return { redirect: cityCategoryPath(metro.city, category) };
  if (category && place) return { redirect: cityPath(place.city) };
  return metro ? { redirect: cityPath(metro.city) } : null;
});

export async function placeMetadata(slug: string, categorySlug: string | null, pageNumber: number): Promise<Metadata> {
  const route = await loadPlaceRoute(slug, categorySlug);
  if (!route || !("page" in route)) return UNPUBLISHED_COLLECTION_METADATA;
  const { copy, path } = route.page;
  return collectionMetadata({
    title: pageTitle(copy.titles, pageNumber),
    description: copy.description,
    path: pagePath(path, pageNumber),
  });
}
