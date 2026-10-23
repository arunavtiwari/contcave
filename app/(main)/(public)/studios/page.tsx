import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getRandomListings from "@/app/actions/getRandomListings";
import ListingFeed from "@/components/listing/ListingFeed";
import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import StudioBrowse from "@/components/listing/StudioBrowse";
import JsonLd from "@/components/seo/JsonLd";
import EmptyState from "@/components/ui/EmptyState";
import { isHtmlOnlyCrawler } from "@/lib/crawlers";
import { parsePlaceLabelParam } from "@/lib/geo";
import { findCity } from "@/lib/listing/cities";
import { cityPath, citySlug } from "@/lib/listing/cityPaths";
import { toStudioFeedItem } from "@/lib/listing/feedQuery";
import { listingPath } from "@/lib/listing/seo";
import { loadStudioFeed } from "@/lib/listing/studioFeed";
import { absoluteUrl, BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";
import { studioFeedSearchParamsSchema } from "@/schemas/listing";

export const dynamic = "force-dynamic";

const LISTINGS_TITLE = "Book Photo & Video Studios for Rent by the Hour" as const;
const LISTINGS_DESCRIPTION =
  "Compare and book verified photography, video, podcast and event studios in Delhi NCR, Gurgaon, Noida, Chandigarh, Mohali and Lucknow. Hourly pricing, real photos and instant availability." as const;

type SearchParams = Record<string, string | string[] | undefined>;

interface HomeProps {
  searchParams: Promise<SearchParams>;
}

const feedFiltersOf = (searchParams: SearchParams) => studioFeedSearchParamsSchema.parse(searchParams);

const placeLabelOf = (searchParams: SearchParams) =>
  typeof searchParams.place === "string" ? parsePlaceLabelParam(searchParams.place) : undefined;

const hasActiveFilters = (searchParams: SearchParams) =>
  Object.values(feedFiltersOf(searchParams)).some((value) => value !== undefined);

async function redirectToCityPage(searchParams: SearchParams) {
  const city = searchParams.locationValue;
  if (typeof city !== "string" || Object.keys(searchParams).length !== 1) return;
  const entry = await findCity(citySlug(city));
  if (entry) redirect(cityPath(entry.city));
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
    alternates: { canonical: "/studios" },
    openGraph: {
      title: LISTINGS_TITLE,
      description: LISTINGS_DESCRIPTION,
      url: `${SITE_URL}/studios`,
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

export default async function StudiosPage(props: HomeProps) {
  await redirectToCityPage(await props.searchParams);
  const feed = <HomeContent {...props} />;
  const htmlOnlyCrawler = isHtmlOnlyCrawler((await headers()).get("user-agent"));

  return (
    <StudioBrowse
      feed={htmlOnlyCrawler ? feed : (
        <Suspense fallback={<ListingGridSkeleton count={6} hideActions />}>
          {feed}
        </Suspense>
      )}
    />
  );
}

async function HomeContent(props: HomeProps) {
  const searchParams = await props.searchParams;
  const isFiltered = hasActiveFilters(searchParams);

  const [feed, currentUser] = await Promise.all([
    loadStudioFeed(feedFiltersOf(searchParams), placeLabelOf(searchParams)),
    getCurrentUser(),
  ]);
  const { items } = feed.page;
  const fallbackItems = items.length === 0 ? (await getRandomListings(6)).map(toStudioFeedItem) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/studios#itemlist`,
    name: "Studios available on ContCave",
    url: `${SITE_URL}/studios`,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(listingPath(item)),
      name: item.title.trim(),
      ...(item.imageSrc[0] ? { image: item.imageSrc[0] } : {}),
    })),
  };

  return (
    <>
      {items.length > 0 && <JsonLd id="home-listings-jsonld" data={jsonLd} />}
      {items.length === 0 ? (
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
          {fallbackItems.length > 0 && (
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
                page={{ items: fallbackItems, nextCursor: null, nearestKm: null, origin: null }}
                filters={{}}
                currentUser={currentUser}
              />
            </div>
          )}
        </div>
      ) : (
        <ListingFeed
          key={feed.key}
          page={feed.page}
          filters={feed.filters}
          currentUser={currentUser}
          nearLabel={feed.nearLabel}
        />
      )}
    </>
  );
}
