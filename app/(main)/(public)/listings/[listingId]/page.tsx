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
import MoreStudios, { type MoreStudiosItem } from "@/components/listing/MoreStudios";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import { cityPath, citySlug, findCity } from "@/lib/listing/cities";
import { buildListingJsonLd, buildListingMetadata, kindOf, listingPath } from "@/lib/listing/seo";
import { getPlainTextFromHTML } from "@/lib/richText";
import type { BreadcrumbItem } from "@/lib/seo";
import type { FullListing } from "@/types/listing";
import type { ListingAvailability } from "@/types/reservation";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };
type SearchParams = Record<string, string | string[] | undefined>;

const RELATED_LIMIT = 6;

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

async function loadRelated(listing: FullListing): Promise<MoreStudiosItem[]> {
  const picked = new Map<string, FullListing>();
  const add = (candidates: FullListing[]) => {
    for (const candidate of candidates) {
      if (picked.size >= RELATED_LIMIT) return;
      if (candidate.id !== listing.id && !picked.has(candidate.id)) picked.set(candidate.id, candidate);
    }
  };

  if (listing.locationValue) add(await getListings({ locationValue: listing.locationValue }));
  if (picked.size < 4 && listing.category) add(await getListings({ category: listing.category }));

  return Array.from(picked.values()).map((item) => ({
    id: item.id,
    title: item.title,
    href: listingPath(item),
    image: item.imageSrc?.[0],
    kind: kindOf(item),
  }));
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
    permanentRedirect(`/listings/${listing.slug}${toQueryString(await props.searchParams)}`);
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

  const breadcrumbs: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    { name: "Studios", href: "/studios" },
    ...(city ? [{ name: city.city, href: cityPath(city.city) }] : []),
    { name: listing.title },
  ];

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
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
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
        items={related}
        moreHref={city ? cityPath(city.city) : "/studios"}
        moreLabel={city ? `All studios in ${city.city}` : "Browse all studios"}
      />
    </main>
  );
}
