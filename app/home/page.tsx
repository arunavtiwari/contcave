import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";
import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingFeed from "@/components/listing/ListingFeed";
import Categories from "@/components/navbar/Categories";
import { absoluteUrl, BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const LISTINGS_DESCRIPTION =
  "Browse verified photography, video, and event studios across India. Filter by city, amenities, or dates to find the perfect space." as const;

export const metadata: Metadata = {
  title: "Explore Studios for Rent",
  description: LISTINGS_DESCRIPTION,
  keywords: [
    "studio rental",
    "photography studio",
    "video shoot space",
    "creative studio",
    "ContCave listings",
    "studio spaces India",
    "book studio online",
    "hourly studio rental",
  ],
  alternates: { canonical: "/home" },
  openGraph: {
    title: "Explore Studios for Rent",
    description: LISTINGS_DESCRIPTION,
    url: `${SITE_URL}/home`,
    siteName: BRAND_NAME,
    type: "website",
    images: [
      {
        url: absoluteUrl(OG_IMAGE),
        width: 1200,
        height: 630,
        alt: "ContCave Studio Listings",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Studios for Rent",
    description: LISTINGS_DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [absoluteUrl(OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

interface HomeProps {
  searchParams: Promise<IListingsParams>;
}

export default async function Home(props: HomeProps) {
  const searchParams = await props.searchParams;
  const [listing, currentUser] = await Promise.all([
    getListings(searchParams),
    getCurrentUser(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/home#itemlist`,
    name: "Studios available on ContCave",
    url: `${SITE_URL}/home`,
    publisher: { "@id": `${SITE_URL}/#localbusiness` },
    itemListElement: listing.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(`/listings/${item.id}`),
      item: {
        "@type": "LocalBusiness",
        name: item.title,
        description: item.description,
        image: absoluteUrl(
          Array.isArray(item.imageSrc) ? item.imageSrc[0] ?? OG_IMAGE : item.imageSrc ?? OG_IMAGE
        ),
        url: absoluteUrl(`/listings/${item.id}`),
        priceRange: item.price ? `INR ${item.price}` : undefined,
        address: {
          "@type": "PostalAddress",
          addressCountry: "IN",
          addressRegion: item.locationValue,
        },
      },
    })),
  };

  if (listing.length === 0) {
    return (
      <ClientOnly>
        <EmptyState showReset />
      </ClientOnly>
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientOnly>
        <Container>
          <Categories />
          <ListingFeed
            listings={listing}
            currentUser={currentUser}
            autoSortByLocation={!searchParams.locationValue}
          />
        </Container>
      </ClientOnly>
    </>
  );
}
