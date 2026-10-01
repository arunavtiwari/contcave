import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import getAmenities from "@/app/actions/getAmenities";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getListings from "@/app/actions/getListings";
import getReviewCount from "@/app/actions/getReviewCount";
import getReviews from "@/app/actions/getReviews";
import { getPublicDayStatuses, getReservations } from "@/app/actions/reservationActions";
import ListingClient from "@/components/listing/ListingClient";
import MoreStudios from "@/components/listing/MoreStudios";
import JsonLd from "@/components/seo/JsonLd";
import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import { categoriesOf } from "@/lib/listing/categories";
import {
  cityTrail,
  findCity,
  STUDIOS_TRAIL,
} from "@/lib/listing/cities";
import { cityPath, citySlug } from "@/lib/listing/cityPaths";
import { buildListingJsonLd, buildListingMetadata } from "@/lib/listing/seo";
import { getPlainTextFromHTML } from "@/lib/richText";
import type { BreadcrumbItem } from "@/lib/seo";
import type { FullListing, safeListing } from "@/types/listing";
import type { ListingAvailability } from "@/types/reservation";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };
type SearchParams = Record<string, string | string[] | undefined>;

const RELATED_LIMIT = 4;

const loadListing = cache((listingId?: string) => getListingById({ listingId }));

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { listingId } = await params;
  const listing = await loadListing(listingId);
  if (!listing) {
    return {
      title: "Listing",
      description: "Discover verified studios available on ContCave.",
      robots: {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false },
      },
    };
  }

  return buildListingMetadata(listing);
}

async function loadAvailability(listing: FullListing): Promise<ListingAvailability> {
  const [reservations, dayStatuses, googleCalendarEvents] = await Promise.all([
    getReservations({ listingId: listing.id }).catch(() => []),
    getPublicDayStatuses(listing.id).catch(() => []),
    listing.user?.googleCalendarConnected
      ? Promise.race([
        fetchListingCalendarEvents(listing.id),
        new Promise<[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ]).catch(() => [])
      : Promise.resolve([]),
  ]);

  return { reservations, dayStatuses, googleCalendarEvents };
}

async function loadRelated(listing: FullListing): Promise<FullListing[]> {
  const ownCategories = categoriesOf(listing);
  const own = new Set(ownCategories.map((category) => category.slug));
  const useCases = [...new Set(ownCategories.flatMap((category) => category.useCases ?? []))];
  const venueTypes = [...new Set(ownCategories.flatMap((category) => category.venueTypes ?? []))];

  const pools = await Promise.all([
    listing.locationValue ? getListings({ locationValue: listing.locationValue }) : [],
    useCases.length ? getListings({ type: useCases.join(",") }) : [],
    venueTypes.length ? getListings({ venueTypes: venueTypes.join(",") }) : [],
  ]);
  const all = Array.from(new Map(pools.flat().map((candidate) => [candidate.id, candidate])).values());
  const score = (candidate: FullListing) => {
    const sameCity = Boolean(listing.locationValue) && candidate.locationValue === listing.locationValue;
    const shared = categoriesOf(candidate).filter((category) => own.has(category.slug)).length;
    return (sameCity ? 10 : 0) + Math.min(shared, 3);
  };

  return all
    .filter((candidate) => candidate.id !== listing.id)
    .map((candidate, index) => ({ candidate, index, score: score(candidate) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, RELATED_LIMIT)
    .map((item) => item.candidate);
}

function toQueryString(searchParams: SearchParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.append(key, value);
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export default async function ListingPage(props: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { listingId } = await props.params;
  const listing = await loadListing(listingId);
  if (!listing) notFound();

  if (listing.slug && listingId !== listing.slug) {
    permanentRedirect(`/studio/${listing.slug}${toQueryString(await props.searchParams)}`);
  }

  const availability = loadAvailability(listing);
  const [currentUser, reviews, reviewCount, amenities, city, related] = await Promise.all([
    getCurrentUser().catch(() => null),
    getReviews(listing.id),
    getReviewCount(listing.id),
    getAmenities(),
    findCity(citySlug(listing.locationValue ?? "")).catch(() => undefined),
    loadRelated(listing).catch(() => []),
  ]);

  const breadcrumbs: BreadcrumbItem[] = [...(city ? cityTrail(city.city) : STUDIOS_TRAIL), { name: listing.title }];


  return (
    <main>
      <JsonLd
        id={`listing-jsonld-${listing.id}`}
        data={buildListingJsonLd(listing, { amenities, reviews, reviewCount, breadcrumbs })}
      />
      <ListingClient
        listing={listing}
        currentUser={currentUser}
        availability={availability}
        reviews={reviews}
        amenities={amenities}
        processedDescription={listing.description}
        processedTerms={listing.customTerms ?? null}
        descriptionShouldTruncate={getPlainTextFromHTML(listing.description, 0).length > 250}
        initialSelectedSetIds={
          listing.hasSets && listing.sets && listing.sets.length > 0
            ? [listing.sets[0].id]
            : []
        }
      />
      <MoreStudios
        heading={city ? `More studios in ${city.city}` : "More studios you may like"}
        listings={related as unknown as safeListing[]}
        currentUser={currentUser}
        moreHref={city ? cityPath(city.city) : "/studios"}
        moreLabel={city ? `All studios in ${city.city}` : "Browse all studios"}
      />
    </main>
  );
}
