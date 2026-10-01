import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import ListingFeed from "@/components/listing/ListingFeed";
import StudioBrowse from "@/components/listing/StudioBrowse";
import JsonLd from "@/components/seo/JsonLd";
import {
  cityTrail,
  describeCity,
  findCity,
  venueTypeLinks,
} from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";
import { cityCollectionJsonLd, collectionMetadata, UNPUBLISHED_COLLECTION_METADATA } from "@/lib/listing/seo";
import { loadStudioFeed } from "@/lib/listing/studioFeed";

type RouteParams = { city: string };

const titleFor = (city: string) => `Studios in ${city}`;

const loadCity = cache(async (slug: string) => {
  const entry = await findCity(slug);
  return entry ? { entry, ...describeCity(entry) } : null;
});

export async function generateMetadata({ params }: { params: Promise<RouteParams> }): Promise<Metadata> {
  const { city: slug } = await params;
  const page = await loadCity(slug);
  if (!page) return UNPUBLISHED_COLLECTION_METADATA;

  return collectionMetadata({ title: titleFor(page.entry.city), description: page.description, path: cityPath(page.entry.city) });
}

export default async function CityStudiosPage(props: { params: Promise<RouteParams> }) {
  const { city: slug } = await props.params;
  const [page, currentUser] = await Promise.all([loadCity(slug), getCurrentUser()]);
  if (!page) notFound();

  const { entry, description } = page;
  const feed = await loadStudioFeed({ locationValues: entry.locationValues });
  const title = titleFor(entry.city);
  const trail = cityTrail(entry.city);

  return (
    <>
      <JsonLd
        id={`city-jsonld-${entry.slug}`}
        data={cityCollectionJsonLd({ path: cityPath(entry.city), name: title, description, city: entry.city, listings: feed.page.items, trail })}
      />
      <StudioBrowse
        title={title}
        city={entry.city}
        venueTypeHrefs={venueTypeLinks(entry)}
        feed={<ListingFeed key={feed.key} page={feed.page} filters={feed.filters} currentUser={currentUser} />}
      />
    </>
  );
}
