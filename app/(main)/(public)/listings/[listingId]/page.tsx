import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import getAmenities from "@/app/actions/getAmenities";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getReviewCount from "@/app/actions/getReviewCount";
import getReviews from "@/app/actions/getReviews";
import { getPublicDayStatuses, getReservations } from "@/app/actions/reservationActions";
import ListingClient from "@/components/listing/ListingClient";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import Faq from "@/components/seo/Faq";
import JsonLd from "@/components/seo/JsonLd";
import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import { cityPath, citySlug, findCity } from "@/lib/listing/cities";
import { buildListingFaq } from "@/lib/listing/faq";
import { buildListingJsonLd, buildListingMetadata } from "@/lib/listing/seo";
import { getPlainTextFromHTML } from "@/lib/richText";
import type { BreadcrumbItem } from "@/lib/seo";
import type { FullListing } from "@/types/listing";
import type { ListingAvailability } from "@/types/reservation";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };

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

export default async function ListingPage(props: { params: Promise<RouteParams> }) {
  const { listingId } = await props.params;
  const listing = await loadListing(listingId);
  if (!listing) notFound();

  const availability = loadAvailability(listing);
  const [currentUser, reviews, reviewCount, amenities, city] = await Promise.all([
    getCurrentUser().catch(() => null),
    getReviews(listing.id),
    getReviewCount(listing.id),
    getAmenities(),
    findCity(citySlug(listing.locationValue ?? "")).catch(() => undefined),
  ]);

  const faq = buildListingFaq(listing, amenities);
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
        data={buildListingJsonLd(listing, { amenities, reviews, reviewCount, faq, breadcrumbs })}
      />
      <ListingClient
        listing={listing}
        currentUser={currentUser}
        availability={availability}
        reviews={reviews}
        amenities={amenities}
        breadcrumbs={<Breadcrumbs items={breadcrumbs} />}
        faq={<Faq items={faq} />}
        processedDescription={listing.description}
        processedTerms={listing.customTerms ?? null}
        descriptionShouldTruncate={getPlainTextFromHTML(listing.description, 0).length > 250}
        initialSelectedSetIds={
          listing.hasSets && listing.sets && listing.sets.length > 0
            ? [listing.sets[0].id]
            : []
        }
      />
    </main>
  );
}
