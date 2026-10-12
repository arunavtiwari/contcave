import type { Metadata } from "next";

import PlaceLanding from "@/components/listing/PlaceLanding";
import { placeMetadata } from "@/lib/listing/placePage";
import { pageFromParams, type SearchParams } from "@/lib/pagination";

type Props = {
  params: Promise<{ city: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ city }, query] = await Promise.all([params, searchParams]);
  return placeMetadata(city, null, pageFromParams(query));
}

export default async function CityStudiosPage({ params, searchParams }: Props) {
  const [{ city }, query] = await Promise.all([params, searchParams]);
  return <PlaceLanding slug={city} categorySlug={null} pageNumber={pageFromParams(query)} />;
}
