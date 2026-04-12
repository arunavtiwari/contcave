import type { Metadata } from "next";
import { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getReservation from "@/app/actions/getReservations";
import EmptyState from "@/components/EmptyState";
import ListingSkeleton from "@/components/listing/ListingSkeleton";
import ListingClient from "@/components/ListingClient";
import { fetchListingCalendarEvents } from "@/lib/calendar/fetchEvents";
import prisma from "@/lib/prismadb";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { absoluteUrl, BRAND_NAME, DEFAULT_KEYWORDS, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };

const asciiClean = (
  value: string | string[] | undefined | null
): string | undefined => {
  const source = Array.isArray(value) ? value.join(" ") : value;
  return source
    ?.replace(/<[^>]*>?/gm, " ") // Strip HTML tags
    .replace(/&#?[a-z0-9]+;/ig, " ") // Strip HTML entities
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { listingId } = await params;
  if (!listingId) {
    return {
      title: "Listing",
      description: "Discover verified studios available on ContCave.",
    };
  }

  const listing = await getListingById({ listingId });
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

  const description =
    asciiClean(listing.description) ?? `Book ${listing.title} for your next production on ContCave.`;
  const imageCandidates =
    Array.isArray(listing.imageSrc) && listing.imageSrc.length > 0
      ? listing.imageSrc
      : [OG_IMAGE];
  const image = absoluteUrl(imageCandidates[0] ?? OG_IMAGE);
  const slugOrId = listing.slug ?? listing.id;
  const url = `${SITE_URL}/listings/${slugOrId}`;
  const title = listing.title;

  return {
    title,
    description,
    keywords: [
      listing.title,
      listing.locationValue,
      listing.category,
      "studio rental",
      "photography studio",
      "shoot space",
      "ContCave",
      ...DEFAULT_KEYWORDS.slice(0, 10),
    ],
    alternates: { canonical: `/listings/${slugOrId}` },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: BRAND_NAME,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@ContCave",
      creator: "@ContCave",
      images: [image],
    },
    robots: {
      index: listing.active && listing.status === "VERIFIED",
      follow: true,
      googleBot: {
        index: listing.active && listing.status === "VERIFIED",
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

const ListingPageData = async (props: { params: Promise<RouteParams> }) => {
  const params = await props.params;
  const listing = await getListingById(params);
  const reservations = await getReservation(params);
  const currentUser = await getCurrentUser();

  if (!listing) {
    return <EmptyState />;
  }

  const googleCalendarEvents = await fetchListingCalendarEvents(listing.id);

  const imageCandidates =
    Array.isArray(listing.imageSrc) && listing.imageSrc.length > 0
      ? listing.imageSrc
      : [OG_IMAGE];
  const imageUrls = imageCandidates.map((src) => absoluteUrl(src));
  const locationData =
    listing.actualLocation && typeof listing.actualLocation === "object"
      ? (listing.actualLocation as Record<string, unknown>)
      : {};
  const latlng = Array.isArray((locationData as { latlng?: unknown }).latlng) ? (locationData as { latlng?: number[] }).latlng : undefined;
  const [latitude, longitude] =
    Array.isArray(latlng) && latlng.length >= 2 ? [latlng[0], latlng[1]] : [undefined, undefined];
  interface RawAddress {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    residential?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    state_district?: string;
    postcode?: string;
    country_code?: string;
    country?: string;
  }
  const rawAddress =
    locationData && typeof (locationData as { address?: unknown }).address === "object"
      ? ((locationData as { address?: unknown }).address as RawAddress)
      : {};
  const clean = (value: unknown) =>
    asciiClean(typeof value === "string" ? value : value != null ? String(value) : undefined);
  const postalAddress = (() => {
    const streetAddress =
      clean(rawAddress.road) ??
      clean(rawAddress.suburb) ??
      clean(rawAddress.neighbourhood) ??
      clean(rawAddress.residential);
    const addressLocality =
      clean(rawAddress.city) ??
      clean(rawAddress.town) ??
      clean(rawAddress.village) ??
      clean(rawAddress.municipality) ??
      clean(rawAddress.county);
    const addressRegion = clean(rawAddress.state) ?? clean(rawAddress.state_district);
    const postalCode = clean(rawAddress.postcode);
    const addressCountry = rawAddress.country_code
      ? clean(String(rawAddress.country_code).toUpperCase())
      : clean(rawAddress.country);

    if (!streetAddress && !addressLocality && !addressRegion && !postalCode && !addressCountry) {
      return undefined;
    }

    return {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality,
      addressRegion,
      postalCode,
      addressCountry,
    };
  })();

  const geo =
    latitude != null && longitude != null
      ? {
        "@type": "GeoCoordinates",
        latitude,
        longitude,
      }
      : undefined;

  const amenityNames = new Set<string>();
  if (Array.isArray(listing.amenities)) {
    listing.amenities.forEach((item) => {
      const name = clean(item);
      if (name) amenityNames.add(name);
    });
  }
  if (Array.isArray(listing.otherAmenities)) {
    listing.otherAmenities.forEach((item) => {
      const name = clean(item);
      if (name) amenityNames.add(name);
    });
  }
  const amenityFeature = amenityNames.size
    ? Array.from(amenityNames).map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
      value: true,
    }))
    : undefined;

  const maxGuests = listing.maximumPax
    ? parseInt(String(listing.maximumPax).replace(/[^\d]/g, ""), 10)
    : undefined;

  interface OperationalHours {
    start?: string;
    end?: string;
  }
  const operationalHours =
    listing.operationalHours && typeof listing.operationalHours === "object"
      ? (listing.operationalHours as OperationalHours)
      : {};
  const opens = clean(operationalHours.start);
  const closes = clean(operationalHours.end);
  const openingHoursSpecification = opens || closes
    ? [
      {
        "@type": "OpeningHoursSpecification",
        opens,
        closes,
      },
    ]
    : undefined;

  const priceRange =
    typeof listing.price === "number" && Number.isFinite(listing.price)
      ? `₹${listing.price.toString()}+`
      : undefined;

  const url = absoluteUrl(`/listings/${listing.slug ?? listing.id}`);


  const reviewCount = await prisma.review.count({
    where: { listingId: listing.id },
  });

  const aggregateRating =
    listing.avgReviewRating != null &&
      listing.avgReviewRating > 0 &&
      reviewCount > 0
      ? {
        "@type": "AggregateRating",
        ratingValue: listing.avgReviewRating,
        reviewCount,
      }
      : undefined;

  const eventVenueJsonLd = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    "@id": `${url}#venue`,
    name: listing.title,
    description: asciiClean(listing.description) ?? undefined,
    url,
    image: imageUrls,
    address: postalAddress,
    geo,
    amenityFeature,
    maximumAttendeeCapacity:
      typeof maxGuests === "number" && Number.isFinite(maxGuests) && maxGuests > 0 ? maxGuests : undefined,
    priceRange,
    offers: listing.price
      ? [
        {
          "@type": "Offer",
          priceCurrency: "INR",
          price: listing.price,
          availability: listing.active
            ? "https://schema.org/InStock"
            : "https://schema.org/LimitedAvailability",
          url,
          seller: { "@id": `${SITE_URL}/#localbusiness` },
        },
      ]
      : undefined,
    openingHoursSpecification,
    areaServed: clean(listing.locationValue),
    aggregateRating,
    provider: { "@id": `${SITE_URL}/#localbusiness` },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Listings",
        item: `${SITE_URL}/home`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: listing.title,
        item: url,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(eventVenueJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbJsonLd) }}
      />
      <ListingClient
        listing={listing}
        currentUser={currentUser}
        reservations={reservations}
        googleCalendarEvents={googleCalendarEvents}
      />
    </>
  );
};

export default function ListingPage(props: { params: Promise<RouteParams> }) {
  return (
    <main>
      <Suspense fallback={<ListingSkeleton />}>
        <ListingPageData params={props.params} />
      </Suspense>
    </main>
  );
}
