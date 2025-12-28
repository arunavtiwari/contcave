import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import EmptyState from "@/components/EmptyState";
import ListingFeed from "@/components/listing/ListingFeed";
import Categories from "@/components/navbar/Categories";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";
import type { Metadata } from "next";
import { BRAND_NAME, OG_IMAGE, SITE_URL, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const LISTINGS_DESCRIPTION =
  "Browse verified photography, video, and event studios across India. Filter by city, amenities, or dates to find the perfect space." as const;

export const metadata: Metadata = {
  title: `Explore Studios for Rent | ${BRAND_NAME}`,
  description: LISTINGS_DESCRIPTION,
  keywords: [
    "studio rental",
    "photography studio",
    "video shoot space",
    "creative studio",
    "ContCave listings",
    "studio spaces India",
  ],
  alternates: { canonical: "/home" },
  openGraph: {
    title: `Explore Studios for Rent | ${BRAND_NAME}`,
    description: LISTINGS_DESCRIPTION,
    url: `${SITE_URL}/home`,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `Explore Studios for Rent | ${BRAND_NAME}`,
    description: LISTINGS_DESCRIPTION,
    images: [OG_IMAGE],
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
    name: "Studios available on ContCave",
    url: `${SITE_URL}/home`,
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
