import type { Metadata } from "next";

import PlaceLanding from "@/components/listing/PlaceLanding";
import { placeMetadata } from "@/lib/listing/placePage";
import { pageFromParams, type SearchParams } from "@/lib/pagination";

type Props = {
  params: Promise<{ city: string; category: string }>;
  searchParams: Promise<SearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ city, category }, query] = await Promise.all([params, searchParams]);
  return placeMetadata(city, category, pageFromParams(query));
}

export default async function CityCategoryPage({ params, searchParams }: Props) {
  const [{ city, category }, query] = await Promise.all([params, searchParams]);
  return <PlaceLanding slug={city} categorySlug={category} pageNumber={pageFromParams(query)} />;
}
