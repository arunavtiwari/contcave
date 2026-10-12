import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getRandomListings from "@/app/actions/getRandomListings";
import ListingFeed from "@/components/listing/ListingFeed";
import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import LocationBar from "@/components/listing/LocationBar";
import PagedFeed from "@/components/listing/PagedFeed";
import StudioBrowse from "@/components/listing/StudioBrowse";
import JsonLd from "@/components/seo/JsonLd";
import EmptyState from "@/components/ui/EmptyState";
import { isHtmlOnlyCrawler } from "@/lib/crawlers";
import { parsePlaceLabelParam } from "@/lib/geo";
import { coveredCityNames, landingPlaceFor } from "@/lib/listing/cities";
import { cityPath, coverageArea } from "@/lib/listing/cityPaths";
import { toStudioFeedItem } from "@/lib/listing/feedQuery";
import { collectionMetadata, listingPath } from "@/lib/listing/seo";
import { loadStudioFeed } from "@/lib/listing/studioFeed";
import { pageFromParams, pagePath, pageTitle, redirectPastLastPage, type SearchParams } from "@/lib/pagination";
import { truncateText } from "@/lib/richText";
import { absoluteUrl, META_DESCRIPTION_LENGTH } from "@/lib/seo";
import { studioFeedSearchParamsSchema } from "@/schemas/listing";

export const dynamic = "force-dynamic";

const STUDIOS_PATH = "/studios";
const LISTINGS_TITLES = ["Book Photo & Video Studios for Rent by the Hour", "Book Photo & Video Studios for Rent"];
const LISTINGS_KEYWORDS = [
  "studio rental",
  "photography studio",
  "video shoot space",
  "creative studio",
  "studio for rent Delhi NCR",
  "podcast studio for rent",
  "studio spaces India",
  "book studio online",
  "hourly studio rental",
];

interface StudiosProps {
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
  const entry = await landingPlaceFor(city);
  if (entry) redirect(cityPath(entry.city));
}

export async function generateMetadata(props: StudiosProps): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const indexable = !hasActiveFilters(searchParams);
  const page = pageFromParams(searchParams);

  return {
    ...collectionMetadata({
      title: pageTitle(LISTINGS_TITLES, page),
      description: truncateText(
        `Compare and book verified photography, video, podcast and event studios ${coverageArea(await coveredCityNames())}. Hourly pricing, real photos and instant availability.`,
        META_DESCRIPTION_LENGTH
      ),
      path: pagePath(STUDIOS_PATH, page),
    }),
    keywords: LISTINGS_KEYWORDS,
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        ...(indexable ? { "max-image-preview": "large", "max-snippet": -1 } : {}),
      },
    },
  };
}

export default async function StudiosPage(props: StudiosProps) {
  const searchParams = await props.searchParams;
  await redirectToCityPage(searchParams);
  const feed = <StudiosFeed {...props} />;
  const renderInline = pageFromParams(searchParams) > 1 || isHtmlOnlyCrawler((await headers()).get("user-agent"));

  return (
    <StudioBrowse
      feed={renderInline ? feed : (
        <Suspense fallback={<ListingGridSkeleton hideActions />}>
          {feed}
        </Suspense>
      )}
    />
  );
}

async function StudiosFeed(props: StudiosProps) {
  const searchParams = await props.searchParams;
  const isFiltered = hasActiveFilters(searchParams);
  const page = pageFromParams(searchParams);

  const [feed, currentUser] = await Promise.all([
    loadStudioFeed(feedFiltersOf(searchParams), { page, placeLabel: placeLabelOf(searchParams) }),
    getCurrentUser(),
  ]);
  const { items, totalPages } = feed.page;
  redirectPastLastPage(items.length === 0, page, pagePath(STUDIOS_PATH, 1, searchParams));
  const fallbackItems = items.length === 0 ? (await getRandomListings(6)).map(toStudioFeedItem) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${absoluteUrl(pagePath(STUDIOS_PATH, page))}#itemlist`,
    name: "Studios available on ContCave",
    url: absoluteUrl(pagePath(STUDIOS_PATH, page)),
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
      <LocationBar location={feed.location} isLoggedIn={Boolean(currentUser)} />
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
              <ListingFeed items={fallbackItems} currentUser={currentUser} />
            </div>
          )}
        </div>
      ) : (
        <PagedFeed
          items={items}
          currentUser={currentUser}
          nearLabel={feed.nearLabel}
          page={page}
          totalPages={totalPages}
          path={STUDIOS_PATH}
          searchParams={searchParams}
        />
      )}
    </>
  );
}
