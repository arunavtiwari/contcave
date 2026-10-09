import type { Metadata } from "next";

import cloudflareImageLoader from "@/lib/cloudflare-image-loader";
import { truncateText } from "@/lib/richText";
import { toHHMM } from "@/lib/scheduling";
import {
  absoluteUrl,
  BRAND_NAME,
  type BreadcrumbItem,
  breadcrumbJsonLd,
  META_DESCRIPTION_LENGTH,
  OG_IMAGE,
  ORGANIZATION_ID,
  toPlainText,
  WEBSITE_ID,
} from "@/lib/seo";
import type { SafeAmenity } from "@/types/amenity";
import type { FullListing } from "@/types/listing";
import type { PublicReview } from "@/types/review";
import { buildOperationalTimings } from "@/types/scheduling";

type ListingBasics = {
  id: string;
  slug?: string | null;
  title: string;
  category: string;
  locationValue: string;
  venueTypes?: string[];
  imageSrc: string[];
  price?: number | null;
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  actualLocation?: { state?: string; latlng?: [number, number] } | null;
};

const ASSET_ORIGIN = "https://assets.contcave.com/";
const INR = new Intl.NumberFormat("en-IN");
const SCHEMA_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const CITY_ALIASES: Record<string, string[]> = {
  Bengaluru: ["Bangalore"],
  Gurugram: ["Gurgaon"],
  Mumbai: ["Bombay"],
  Kolkata: ["Calcutta"],
  Chennai: ["Madras"],
  Kochi: ["Cochin"],
  Mysore: ["Mysuru"],
  Mangalore: ["Mangaluru"],
  Trivandrum: ["Thiruvananthapuram"],
  Vizag: ["Visakhapatnam"],
  Allahabad: ["Prayagraj"],
};

export const positive = (value: number | null | undefined) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;

const cityOf = (listing: ListingBasics) => listing.locationValue?.trim() || undefined;

const stateOf = (listing: ListingBasics) => listing.actualLocation?.state?.trim() || undefined;

export const kindOf = (listing: Pick<ListingBasics, "venueTypes" | "category">) =>
  listing.venueTypes?.[0] || listing.category || "Studio";

const minimumBookingHours = (listing: { minimumBookingHours?: number | null }) =>
  positive(listing.minimumBookingHours) ?? 1.5;

function amenityNamesOf(
  listing: { amenities?: string[] | null; otherAmenities?: string[] | null },
  amenities: SafeAmenity[]
) {
  const byId = new Map(amenities.map((amenity) => [amenity.id, amenity.name]));
  return Array.from(new Set(
    [...(listing.amenities ?? []).map((id) => byId.get(id)), ...(listing.otherAmenities ?? [])]
      .map((name) => name?.trim())
      .filter((name): name is string => Boolean(name))
  ));
}

const mentionsCity = (text: string, city: string) => {
  const haystack = text.toLowerCase();
  return [city, ...(CITY_ALIASES[city] ?? [])].some((name) => haystack.includes(name.toLowerCase()));
};

const fromPrice = (listing: ListingBasics) => positive(listing.price) ?? positive(listing.priceRangeMin);

const priceRangeOf = (listing: ListingBasics) => {
  const price = positive(listing.price);
  if (price) return `From ₹${INR.format(price)} per hour`;
  const min = positive(listing.priceRangeMin);
  const max = positive(listing.priceRangeMax);
  if (min && max) return `₹${INR.format(min)}–₹${INR.format(max)} per hour`;
  return min ? `From ₹${INR.format(min)} per hour` : undefined;
};

const addressOf = (listing: ListingBasics) => ({
  "@type": "PostalAddress",
  addressLocality: cityOf(listing),
  addressRegion: stateOf(listing),
  addressCountry: "IN",
});

export const listingPath = (listing: { id: string; slug?: string | null }) =>
  `/studio/${listing.slug ?? listing.id}`;

function listingTitle(listing: ListingBasics) {
  const title = listing.title.trim();
  const city = cityOf(listing);
  if (!city || mentionsCity(title, city)) return title;
  return /\sin\s|,/i.test(title) ? `${title}, ${city}` : `${title} in ${city}`;
}

export function listingFacts(listing: FullListing) {
  const city = cityOf(listing);
  const kind = kindOf(listing);
  const area = positive(listing.carpetArea);
  const pax = positive(listing.maximumPax);
  const price = fromPrice(listing);

  return [
    city ? `${kind} in ${city}` : kind,
    area && `${INR.format(area)} sq ft`,
    pax && `up to ${pax} people`,
    price && `from ₹${INR.format(price)}/hr`,
  ]
    .filter(Boolean)
    .join(" · ");
}

function listingDescription(listing: FullListing) {
  const about = toPlainText(listing.description) ?? `Book ${listing.title} on ${BRAND_NAME}.`;
  return truncateText(`${listingFacts(listing)}. ${about}`, META_DESCRIPTION_LENGTH);
}

function socialImage(src: string | undefined, alt: string) {
  if (!src) return { url: absoluteUrl(OG_IMAGE), width: 1200, height: 630, alt };
  if (!src.startsWith(ASSET_ORIGIN)) return { url: absoluteUrl(src), alt };
  return { url: cloudflareImageLoader({ src, width: 1080, quality: 75 }), alt };
}

export function buildListingMetadata(listing: FullListing): Metadata {
  const path = listingPath(listing);
  const title = listingTitle(listing);
  const description = listingDescription(listing);
  const image = socialImage(listing.imageSrc?.[0], listing.title);
  const city = cityOf(listing);
  const kind = kindOf(listing);
  const indexable = listing.active && listing.status === "VERIFIED";

  return {
    title,
    description,
    keywords: [
      listing.title,
      kind,
      city ? `${kind} in ${city}` : undefined,
      city ? `studio rental in ${city}` : undefined,
      "hourly studio rental",
      "shoot space",
      BRAND_NAME,
    ].filter((keyword): keyword is string => Boolean(keyword)),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title,
      description,
      url: absoluteUrl(path),
      siteName: BRAND_NAME,
      locale: "en_IN",
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@ContCave",
      creator: "@ContCave",
      images: [image.url],
    },
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

function openingHours(listing: FullListing) {
  const { byDay } = buildOperationalTimings(listing);
  const dayOfWeek = SCHEMA_DAYS.filter((_, index) => byDay?.[index]?.enabled);
  const opens = toHHMM(listing.operationalHours?.start);
  const closes = toHHMM(listing.operationalHours?.end);
  if (!dayOfWeek.length || !opens || !closes) return undefined;

  return [{ "@type": "OpeningHoursSpecification", dayOfWeek, opens, closes: closes === "00:00" ? "23:59" : closes }];
}

type ListingJsonLdInput = {
  amenities: SafeAmenity[];
  reviews: PublicReview[];
  reviewCount: number;
  breadcrumbs: BreadcrumbItem[];
};

export function buildListingJsonLd(
  listing: FullListing,
  { amenities, reviews, reviewCount, breadcrumbs }: ListingJsonLdInput
) {
  const url = absoluteUrl(listingPath(listing));
  const venueId = `${url}#venue`;
  const images = (listing.imageSrc?.length ? listing.imageSrc : [OG_IMAGE]).map(absoluteUrl);
  const [latitude, longitude] = listing.actualLocation?.latlng ?? [];
  const area = positive(listing.carpetArea);
  const price = listing.listingType === "CURATED" ? undefined : positive(listing.price);
  const curatedLow = listing.listingType === "CURATED" ? fromPrice(listing) : undefined;
  const curatedMax = positive(listing.priceRangeMax);
  const curatedHigh = curatedLow && curatedMax && curatedMax >= curatedLow ? curatedMax : undefined;
  const rating = positive(listing.avgReviewRating);
  const features = amenityNamesOf(listing, amenities);

  const aggregateRating = rating && reviewCount > 0
    ? {
      "@type": "AggregateRating",
      ratingValue: Math.round(rating * 10) / 10,
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    }
    : undefined;

  const reviewItems = reviews
    .filter((review) => review.rating != null && review.comment.trim() && (review.user?.name || review.guestName))
    .slice(0, 5)
    .map((review) => ({
      "@type": "Review",
      author: { "@type": "Person", name: review.user?.name || review.guestName },
      datePublished: review.createdAt.slice(0, 10),
      reviewBody: review.comment.trim(),
      reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5, worstRating: 1 },
    }));

  const rentalOffer = price
    ? {
      "@type": "Offer",
      url,
      price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      availableAtOrFrom: { "@id": venueId },
      seller: { "@id": ORGANIZATION_ID },
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price,
        priceCurrency: "INR",
        unitCode: "HUR",
        unitText: "per hour",
        referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "HUR" },
      },
      eligibleQuantity: { "@type": "QuantitativeValue", minValue: minimumBookingHours(listing), unitCode: "HUR" },
    }
    : curatedLow
      ? {
        "@type": "AggregateOffer",
        url,
        lowPrice: curatedLow,
        highPrice: curatedHigh,
        priceCurrency: "INR",
        offerCount: 1,
        availability: "https://schema.org/InStock",
        seller: { "@id": ORGANIZATION_ID },
      }
      : undefined;

  const rental = rentalOffer && {
    "@type": "Product",
    "@id": `${url}#rental`,
    name: listing.title,
    description: listingDescription(listing),
    image: images,
    url,
    sku: listing.id,
    category: kindOf(listing),
    aggregateRating,
    review: reviewItems.length ? reviewItems : undefined,
    offers: rentalOffer,
  };

  const venue = {
    "@type": "LocalBusiness",
    additionalType: "https://schema.org/EventVenue",
    "@id": venueId,
    name: listing.title,
    description: toPlainText(listing.description),
    url,
    image: images,
    address: addressOf(listing),
    geo: Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { "@type": "GeoCoordinates", latitude, longitude }
      : undefined,
    maximumAttendeeCapacity: positive(listing.maximumPax),
    amenityFeature: features.length
      ? features.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true }))
      : undefined,
    additionalProperty: area
      ? [{ "@type": "PropertyValue", name: "Floor area", value: area, unitCode: "FTK", unitText: "sq ft" }]
      : undefined,
    openingHoursSpecification: openingHours(listing),
    priceRange: priceRangeOf(listing),
    aggregateRating: rental ? undefined : aggregateRating,
    review: !rental && reviewItems.length ? reviewItems : undefined,
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      venue,
      ...(rental ? [rental] : []),
      breadcrumbJsonLd(breadcrumbs, url),
    ],
  };
}

function listingSummaryJsonLd(listing: ListingBasics) {
  const url = absoluteUrl(listingPath(listing));
  return {
    "@type": "LocalBusiness",
    additionalType: "https://schema.org/EventVenue",
    "@id": `${url}#venue`,
    name: listing.title,
    url,
    image: listing.imageSrc?.[0] ? absoluteUrl(listing.imageSrc[0]) : undefined,
    address: addressOf(listing),
    priceRange: priceRangeOf(listing),
  };
}

export const UNPUBLISHED_COLLECTION_METADATA: Metadata = {
  title: "Studios",
  robots: { index: false, follow: true },
};

export function collectionMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const images = [{ url: absoluteUrl(OG_IMAGE), width: 1200, height: 630, alt: title }];
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", title, description, url: absoluteUrl(path), siteName: BRAND_NAME, locale: "en_IN", images },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      site: "@ContCave",
      creator: "@ContCave",
      images: [absoluteUrl(OG_IMAGE)],
    },
  };
}

export function cityCollectionJsonLd({
  path,
  name,
  description,
  city,
  listings,
  trail,
}: {
  path: string;
  name: string;
  description: string;
  city: string;
  listings: ListingBasics[];
  trail: BreadcrumbItem[];
}) {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#page`,
        url,
        name,
        description,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@type": "City", name: city, containedInPlace: { "@type": "Country", name: "India" } },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: listings.length,
          itemListElement: listings.map((listing, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(listingPath(listing)),
            item: listingSummaryJsonLd(listing),
          })),
        },
      },
      breadcrumbJsonLd(trail, url),
    ],
  };
}
