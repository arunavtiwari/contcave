import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";

import getAmenities from "@/app/actions/getAmenities";
import getCurrentUser from "@/app/actions/getCurrentUser";
import { getListingAccess } from "@/app/actions/getListingById";
import getReviewCount from "@/app/actions/getReviewCount";
import getReviews from "@/app/actions/getReviews";
import { getPublicDayStatuses, getReservations } from "@/app/actions/reservationActions";
import ListingClient from "@/components/listing/ListingClient";
import MoreStudios from "@/components/listing/MoreStudios";
import PreviewExpiredState, { PREVIEW_EXPIRED_METADATA } from "@/components/listing/PreviewExpiredState";
import JsonLd from "@/components/seo/JsonLd";
import { istDateKey } from "@/lib/booking/dayAvailability";
import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import { parseBookingPrefill } from "@/lib/listing/bookingPrefill";
import {
  cityTrail,
  landingPlaceFor,
  STUDIOS_TRAIL,
} from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";
import { isListingPublic, LISTING_PREVIEW_PARAM } from "@/lib/listing/preview";
import { getRelatedStudios } from "@/lib/listing/related";
import { buildListingJsonLd, buildListingMetadata, listingPath } from "@/lib/listing/seo";
import { type SearchParams, toQueryString } from "@/lib/pagination";
import { getPlainTextFromHTML } from "@/lib/richText";
import type { BreadcrumbItem } from "@/lib/seo";
import type { FullListing } from "@/types/listing";
import type { ListingAvailability } from "@/types/reservation";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };

const loadListingAccess = cache((listingId?: string, previewToken?: string) => getListingAccess({ listingId, previewToken }));

const previewTokenOf = (searchParams: SearchParams) => {
  const value = searchParams[LISTING_PREVIEW_PARAM];
  return typeof value === "string" ? value : undefined;
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { listingId } = await params;
  const access = await loadListingAccess(listingId, previewTokenOf(await searchParams));
  if (access?.status === "preview-expired") return PREVIEW_EXPIRED_METADATA;
  if (!access) {
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

  return buildListingMetadata(access.listing);
}

/** Only the fields related studios are matched on, so the cache key stays small and stable. */
const relatedSubjectOf = ({ id, locationValue, category, type, venueTypes, setFeatures }: FullListing) => ({
  id,
  locationValue,
  category,
  type,
  venueTypes,
  setFeatures,
});

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

export default async function ListingPage(props: {
  params: Promise<RouteParams>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ listingId }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const access = await loadListingAccess(listingId, previewTokenOf(searchParams));
  if (!access) notFound();
  if (access.status === "preview-expired") return <PreviewExpiredState studioName={access.title} />;

  const { listing } = access;

  if (listing.slug && listingId !== listing.slug) {
    permanentRedirect(`${listingPath(listing)}${toQueryString(searchParams)}`);
  }

  const isPreview = !isListingPublic(listing);
  const prefill = parseBookingPrefill(searchParams, listing.hasSets ? (listing.sets ?? []).map((set) => set.id) : [], istDateKey(new Date()));

  const availability = loadAvailability(listing);
  const [currentUser, reviews, reviewCount, amenities, city, related] = await Promise.all([
    getCurrentUser().catch(() => null),
    getReviews(listing.id),
    getReviewCount(listing.id),
    getAmenities(),
    landingPlaceFor(listing.locationValue ?? "").catch(() => undefined),
    getRelatedStudios(relatedSubjectOf(listing)).catch(() => []),
  ]);

  const breadcrumbs: BreadcrumbItem[] = [...(city ? cityTrail(city.city) : STUDIOS_TRAIL), { name: listing.title }];


  return (
    <main>
      {!isPreview && (
        <JsonLd
          id={`listing-jsonld-${listing.id}`}
          data={buildListingJsonLd(listing, { amenities, reviews, reviewCount, breadcrumbs })}
        />
      )}
      <ListingClient
        listing={listing}
        breadcrumbs={breadcrumbs}
        path={listingPath(listing)}
        isPreview={isPreview}
        currentUser={currentUser}
        availability={availability}
        reviews={reviews}
        amenities={amenities}
        processedDescription={listing.description}
        processedTerms={listing.customTerms ?? null}
        descriptionShouldTruncate={getPlainTextFromHTML(listing.description, 0).length > 250}
        initialSelectedSetIds={
          prefill.setIds.length > 0
            ? prefill.setIds
            : listing.hasSets && listing.sets && listing.sets.length > 0
              ? [listing.sets[0].id]
              : []
        }
        initialDate={prefill.date}
        initialTimeSlot={prefill.timeSlot}
      />
      <MoreStudios
        heading={city ? `More studios in ${city.city}` : "More studios you may like"}
        listings={related}
        currentUser={currentUser}
        moreHref={city ? cityPath(city.city) : "/studios"}
        moreLabel={city ? `All studios in ${city.city}` : "Browse all studios"}
      />
    </main>
  );
}
