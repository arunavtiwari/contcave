import type { Metadata } from "next";
import { headers } from "next/headers";
import { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings, { IListingsParams } from "@/app/actions/getListings";
import getRandomListings from "@/app/actions/getRandomListings";
import Container from "@/components/layout/Container";
import ListingFeed from "@/components/listing/ListingFeed";
import ListingFeedHeader from "@/components/listing/ListingFeedHeader";
import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import Categories from "@/components/navbar/Categories";
import JsonLd from "@/components/seo/JsonLd";
import EmptyState from "@/components/ui/EmptyState";
import { LocationSortProvider } from "@/hooks/useLocationSort";
import { isHtmlOnlyCrawler } from "@/lib/crawlers";
import { listingPath } from "@/lib/listing/seo";
import { absoluteUrl, BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";
import { safeListing } from "@/types/listing";

export const dynamic = "force-dynamic";

const LISTINGS_TITLE = "Book Photo & Video Studios for Rent by the Hour" as const;
const LISTINGS_DESCRIPTION =
  "Compare and book verified photography, video, podcast and event studios in Delhi NCR, Gurgaon, Noida, Chandigarh, Mohali and Lucknow. Hourly pricing, real photos and instant availability." as const;

function hasActiveFilters(params: IListingsParams): boolean {
  return Boolean(
    params.locationValue ||
    params.category ||
    params.type ||
    params.venueTypes ||
    params.aesthetics ||
    params.setFeatures ||
    params.hasSets ||
    params.startDate ||
    params.endDate ||
    params.userId
  );
}

interface HomeProps {
  searchParams: Promise<IListingsParams>;
}

export async function generateMetadata(props: HomeProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const isFiltered = hasActiveFilters(searchParams);

  return {
    title: LISTINGS_TITLE,
    description: LISTINGS_DESCRIPTION,
    keywords: [
      "studio rental",
      "photography studio",
      "video shoot space",
      "creative studio",
      "studio for rent Delhi NCR",
      "podcast studio for rent",
      "studio spaces India",
      "book studio online",
      "hourly studio rental",
    ],
    alternates: { canonical: "/home" },
    openGraph: {
      title: LISTINGS_TITLE,
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
      title: LISTINGS_TITLE,
      description: LISTINGS_DESCRIPTION,
      site: "@ContCave",
      creator: "@ContCave",
      images: [absoluteUrl(OG_IMAGE)],
    },
    robots: {
      index: !isFiltered,
      follow: true,
      googleBot: {
        index: !isFiltered,
        follow: true,
        ...(isFiltered ? {} : { "max-image-preview": "large", "max-snippet": -1 }),
      },
    },
  };
}

export default async function Home(props: HomeProps) {
  const feed = <HomeContent {...props} />;
  const htmlOnlyCrawler = isHtmlOnlyCrawler((await headers()).get("user-agent"));

  return (
    <main>
      <Container>
        <Categories />
        <LocationSortProvider>
          <ListingFeedHeader />
          {htmlOnlyCrawler ? feed : (
            <Suspense fallback={<ListingGridSkeleton count={6} hideActions />}>
              {feed}
            </Suspense>
          )}
        </LocationSortProvider>
      </Container>
    </main>
  );
}

async function HomeContent(props: HomeProps) {
  const searchParams = await props.searchParams;
  const isFiltered = hasActiveFilters(searchParams);

  const [listing, currentUser] = await Promise.all([
    getListings(searchParams),
    getCurrentUser(),
  ]);

  // When filters produce 0 results, fetch popular alternatives to prevent thin content soft 404s
  const fallbackListings = listing.length === 0 ? await getRandomListings(6) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/home#itemlist`,
    name: "Studios available on ContCave",
    url: `${SITE_URL}/home`,
    numberOfItems: listing.length,
    itemListElement: listing.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(listingPath(item)),
      name: item.title.trim(),
      ...(item.imageSrc?.[0] ? { image: item.imageSrc[0] } : {}),
    })),
  };

  return (
    <>
      {listing.length > 0 && <JsonLd id="home-listings-jsonld" data={jsonLd} />}
      {listing.length === 0 ? (
        <div className="space-y-10">
          <EmptyState
            showReset={isFiltered}
            title={isFiltered ? "No exact matches found" : "No listings found"}
            subtitle={
              isFiltered
                ? "Try adjusting or clearing some of your search filters to find available spaces."
                : "We're currently adding new studios. Check back soon!"
            }
          />
          {fallbackListings.length > 0 && (
            <div className="border-t border-border pt-8">
              <div className="mb-6 space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Explore other top studios across India
                </h2>
                <p className="text-sm text-muted-foreground">
                  Here are some popular, verified spaces available for booking.
                </p>
              </div>
              <ListingFeed
                listings={fallbackListings as unknown as safeListing[]}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>
      ) : (
        <ListingFeed
          listings={listing as unknown as safeListing[]}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
