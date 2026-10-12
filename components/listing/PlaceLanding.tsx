import { notFound, redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import PagedFeed from "@/components/listing/PagedFeed";
import PlaceGuide from "@/components/listing/PlaceGuide";
import PlaceHero from "@/components/listing/PlaceHero";
import StudioBrowse from "@/components/listing/StudioBrowse";
import JsonLd from "@/components/seo/JsonLd";
import { parseBrowseSort } from "@/lib/listing/browseSort";
import { loadPlaceRoute } from "@/lib/listing/placePage";
import { cityCollectionJsonLd } from "@/lib/listing/seo";
import { loadStudioFeed, pickedBrowseLocation } from "@/lib/listing/studioFeed";
import { pagePath, pageTitle, redirectPastLastPage, type SearchParams } from "@/lib/pagination";

type Props = {
  slug: string;
  categorySlug: string | null;
  pageNumber: number;
  searchParams: SearchParams;
};

export default async function PlaceLanding({ slug, categorySlug, pageNumber, searchParams }: Props) {
  const route = await loadPlaceRoute(slug, categorySlug);
  if (!route) notFound();
  if ("redirect" in route) redirect(route.redirect);

  const { page } = route;
  const { entry, category, copy } = page;
  const filters = { locationValues: entry.locationValues, studioCategory: category?.slug };
  const [feed, currentUser, initialLocation] = await Promise.all([
    loadStudioFeed(filters, { page: pageNumber, order: parseBrowseSort(searchParams.sort) }),
    getCurrentUser(),
    pickedBrowseLocation(filters),
  ]);
  const { items, totalPages } = feed.page;
  redirectPastLastPage(items.length === 0, pageNumber, page.path);
  if (items.length === 0) notFound();

  const firstPage = pageNumber === 1;

  return (
    <>
      <JsonLd
        id={`place-jsonld-${entry.slug}-${category?.slug ?? "all"}`}
        data={cityCollectionJsonLd({
          path: pagePath(page.path, pageNumber),
          name: pageTitle(copy.titles, pageNumber),
          description: copy.description,
          city: entry.city,
          isRegion: Boolean(entry.cities),
          listings: items,
          trail: page.trail,
        })}
      />
      <StudioBrowse
        hero={<PlaceHero page={page} pageLabel={firstPage ? undefined : `Page ${pageNumber} of ${totalPages}`} showFaq={firstPage} />}
        city={entry.locationValues.join(",")}
        initialLocation={initialLocation}
        isLoggedIn={Boolean(currentUser)}
        feed={(
          <PagedFeed
            feed={feed.page}
            order={feed.order}
            currentUser={currentUser}
            page={pageNumber}
            path={page.path}
            searchParams={searchParams}
          />
        )}
        guide={firstPage ? <PlaceGuide page={page} /> : undefined}
      />
    </>
  );
}
