import { ListingStatus } from "@prisma/client";
import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import getReservation from "@/app/actions/getReservations";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ListingClient from "@/components/ListingClient";
import { absoluteUrl, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type RouteParams = { listingId?: string };

const asciiClean = (value: string | string[] | undefined | null): string | undefined => {
  const source = Array.isArray(value) ? value.join(" ") : value;
  return source
    ?.replace(/[^\x20-\x7E]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { listingId } = await params;
  if (!listingId) {
    return {
      title: "Demo",
      description: "Preview demo listing on ContCave.",
      robots: { index: false, follow: false },
    };
  }

  const listing = await getListingById({ listingId });
  if (!listing) {
    return {
      title: "Demo",
      description: "Preview demo listing on ContCave.",
      robots: { index: false, follow: false },
    };
  }

  const description =
    asciiClean(listing.description) ?? `Preview ${listing.title} on ContCave.`;
  const image = absoluteUrl(
    Array.isArray(listing.imageSrc) && listing.imageSrc.length > 0
      ? listing.imageSrc[0]
      : OG_IMAGE
  );
  const url = `${SITE_URL}/demo/${listingId}`;
  const title = `${listing.title} (Demo)`;

  return {
    title,
    description,
    alternates: { canonical: `/demo/${listingId}` },
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
    robots: { index: false, follow: false },
  };
}

const DemoListingPage = async ({ params }: { params: Promise<RouteParams> }) => {
  const { listingId } = await params;
  const listing = await getListingById({ listingId });
  const reservations = await getReservation({ listingId });
  const currentUser = await getCurrentUser();

  if (!listing) {
    return (
      <ClientOnly>
        <EmptyState
          title="Listing not found"
          subtitle="This demo listing may have been removed or is unavailable."
        />
      </ClientOnly>
    );
  }

  if (listing.status !== ListingStatus.PENDING) {
    return (
      <ClientOnly>
        <EmptyState
          title="Not a Demo Listing"
          subtitle="Only pending listings are available in demo mode."
        />
      </ClientOnly>
    );
  }


  const imageUrls = Array.isArray(listing.imageSrc) && listing.imageSrc.length > 0
    ? listing.imageSrc.map((src: string) => absoluteUrl(src))
    : [absoluteUrl(OG_IMAGE)];

  const eventVenueJsonLd = {
    "@context": "https://schema.org",
    "@type": "EventVenue",
    name: listing.title,
    description: asciiClean(listing.description) ?? undefined,
    url: absoluteUrl(`/demo/${listing.id}`),
    image: imageUrls,
    priceRange:
      typeof listing.price === "number" && Number.isFinite(listing.price)
        ? `₹${listing.price}+`
        : undefined,
  };

  return (
    <ClientOnly>
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(eventVenueJsonLd).replace(/</g, '\\u003c') }}
        />
        <div className="relative">
          <div className="absolute top-3 right-3 left-3 sm:left-auto sm:top-4 sm:right-4 
            bg-yellow-100 text-yellow-800 text-center px-3 py-1.5 rounded-md 
            text-xs sm:text-sm font-medium z-10 shadow-xs whitespace-normal wrap-break-word">
            Demo Preview – Not Public Yet
          </div>

          <ListingClient
            listing={listing}
            currentUser={currentUser}
            reservations={reservations}

          />
        </div>
      </>
    </ClientOnly>
  );
};

export default DemoListingPage;
