import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getReservation from "@/app/actions/getReservations";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ListingClient from "@/components/ListingClient";
import type { Metadata } from "next";
import { BRAND_NAME, OG_IMAGE, SITE_URL, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };

const asciiClean = (
  value: string | string[] | undefined | null
): string | undefined => {
  const source = Array.isArray(value) ? value.join(" ") : value;
  return source
    ?.replace(/[^\x20-\x7E]+/g, " ")
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
      title: `Listing | ${BRAND_NAME}`,
      description: "Discover verified studios available on ContCave.",
    };
  }

  const listing = await getListingById({ listingId });
  if (!listing) {
    return {
      title: `Listing | ${BRAND_NAME}`,
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
  const url = `${SITE_URL}/listings/${listingId}`;
  const title = `${listing.title} | ${BRAND_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: `/listings/${listingId}` },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

const ListingPage = async (props: { params: Promise<RouteParams> }) => {
  const params = await props.params;
  const listing = await getListingById(params);
  const reservations = await getReservation(params);
  const currentUser = await getCurrentUser();

  if (!listing) {
    return (
      <ClientOnly>
        <EmptyState />
      </ClientOnly>
    );
  }

  const imageCandidates =
    Array.isArray(listing.imageSrc) && listing.imageSrc.length > 0
      ? listing.imageSrc
      : [OG_IMAGE];
  const imageUrls = imageCandidates.map((src) => absoluteUrl(src));
  const locationData =
    listing.actualLocation && typeof listing.actualLocation === "object"
      ? (listing.actualLocation as Record<string, any>)
      : {};
  const latlng = Array.isArray(locationData.latlng) ? locationData.latlng : undefined;
  const [latitude, longitude] =
    Array.isArray(latlng) && latlng.length >= 2 ? [latlng[0], latlng[1]] : [undefined, undefined];
  const rawAddress =
    locationData && typeof locationData.address === "object"
      ? (locationData.address as Record<string, any>)
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

  const operationalHours =
    listing.operationalHours && typeof listing.operationalHours === "object"
      ? (listing.operationalHours as Record<string, any>)
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

  const url = absoluteUrl(`/listings/${listing.id}`);

  const lodgingBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${url}#lodging`,
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
          },
        ]
      : undefined,
    openingHoursSpecification,
    areaServed: clean(listing.locationValue),
  };

  return (
    <ClientOnly>
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(lodgingBusinessJsonLd) }}
        />
        <ListingClient
          listing={listing}
          currentUser={currentUser}
          reservations={reservations}
        />
      </>
    </ClientOnly>
  );
};

export default ListingPage;
