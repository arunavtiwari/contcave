import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import ListingFeed from "@/components/listing/ListingFeed";
import StudioBrowse from "@/components/listing/StudioBrowse";
import JsonLd from "@/components/seo/JsonLd";
import {
  cityPath,
  cityTrail,
  describeCity,
  findCity,
  MIN_CITY_LISTINGS,
  venueTypeLinks,
} from "@/lib/listing/cities";
import { cityCollectionJsonLd, collectionMetadata, UNPUBLISHED_COLLECTION_METADATA } from "@/lib/listing/seo";
import type { safeListing } from "@/types/listing";

type RouteParams = { city: string };

const titleFor = (city: string) => `Studios in ${city}`;

const loadCity = cache(async (slug: string) => {
  const entry = await findCity(slug);
  if (!entry) return null;
  const listings = await getListings({ locationValue: entry.city });
  return listings.length >= MIN_CITY_LISTINGS ? { entry, listings, ...describeCity(entry, listings) } : null;
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

  const { entry, listings, description } = page;
  const title = titleFor(entry.city);
  const trail = cityTrail(entry.city);

  return (
    <>
      <JsonLd
        id={`city-jsonld-${entry.slug}`}
        data={cityCollectionJsonLd({ path: cityPath(entry.city), name: title, description, city: entry.city, listings, trail })}
      />
      <StudioBrowse
        title={title}
        city={entry.city}
        venueTypeHrefs={venueTypeLinks(entry)}
        feed={<ListingFeed listings={listings as unknown as safeListing[]} currentUser={currentUser} />}
      />
    </>
  );
}
