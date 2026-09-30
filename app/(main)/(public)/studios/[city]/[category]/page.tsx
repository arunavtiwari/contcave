import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import ListingFeed from "@/components/listing/ListingFeed";
import StudioBrowse from "@/components/listing/StudioBrowse";
import JsonLd from "@/components/seo/JsonLd";
import { findCategory, matchesCategory, MIN_CATEGORY_LISTINGS, type StudioCategory } from "@/lib/listing/categories";
import {
  cityCategoryPath,
  cityPath,
  cityTrail,
  describeCityCategory,
  findCity,
  venueTypeLinks,
} from "@/lib/listing/cities";
import { cityCollectionJsonLd, collectionMetadata, UNPUBLISHED_COLLECTION_METADATA } from "@/lib/listing/seo";
import type { safeListing } from "@/types/listing";

type RouteParams = { city: string; category: string };

const titleFor = (category: StudioCategory, city: string) => `${category.name} in ${city}`;

const loadPage = cache(async (citySlugParam: string, categorySlug: string) => {
  const category = findCategory(categorySlug);
  const entry = category ? await findCity(citySlugParam) : undefined;
  if (!category || !entry) return null;

  const listings = (await getListings({ locationValue: entry.city }))
    .filter((listing) => matchesCategory(listing, category));
  if (listings.length < MIN_CATEGORY_LISTINGS) return null;

  return { entry, category, listings, ...describeCityCategory(entry, category, listings) };
});

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { city, category } = await params;
  const page = await loadPage(city, category);
  if (!page) return UNPUBLISHED_COLLECTION_METADATA;

  return collectionMetadata({
    title: titleFor(page.category, page.entry.city),
    description: page.description,
    path: cityCategoryPath(page.entry.city, page.category),
  });
}

export default async function CityCategoryPage(props: { params: Promise<RouteParams> }) {
  const { city, category: categorySlug } = await props.params;
  const [page, currentUser] = await Promise.all([loadPage(city, categorySlug), getCurrentUser()]);
  if (!page) notFound();

  const { entry, category, listings, description } = page;
  const title = titleFor(category, entry.city);
  const trail = [...cityTrail(entry.city), { name: category.name }];

  const activeVenueType = category.venueTypes?.[0];
  const venueTypeHrefs = {
    ...venueTypeLinks(entry),
    ...(activeVenueType ? { [activeVenueType]: cityPath(entry.city) } : {}),
  };

  return (
    <>
      <JsonLd
        id={`city-category-jsonld-${entry.slug}-${category.slug}`}
        data={cityCollectionJsonLd({
          path: cityCategoryPath(entry.city, category),
          name: title,
          description,
          city: entry.city,
          listings,
          trail,
        })}
      />
      <StudioBrowse
        title={title}
        city={entry.city}
        venueTypeHrefs={venueTypeHrefs}
        activeVenueType={activeVenueType}
        feed={<ListingFeed listings={listings as unknown as safeListing[]} currentUser={currentUser} />}
      />
    </>
  );
}
