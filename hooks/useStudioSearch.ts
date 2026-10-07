"use client";

import { usePathname, useSearchParams } from "next/navigation";

import useIndianCities from "@/hooks/useCities";
import { type LatLng, parseLatLngParam, parsePlaceLabelParam, searchRadiusKm } from "@/lib/geo";
import { citySlug } from "@/lib/listing/cityPaths";

const CITY_PAGE = /^\/studios\/([^/]+)/;

export type SearchPlace = { label: string; latlng: LatLng; radiusKm: number };

export function useStudioSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  const { getAll, getByValue } = useIndianCities();

  const cityParam = params?.get("locationValue");
  const citySlugParam = pathname?.match(CITY_PAGE)?.[1];
  const city = cityParam
    ? getByValue(cityParam)
    : citySlugParam
      ? getAll().find((entry) => citySlug(entry.value) === citySlugParam)
      : undefined;

  const near = parseLatLngParam(params?.get("near"));
  const place: SearchPlace | null = near
    ? {
      label: parsePlaceLabelParam(params?.get("place")) ?? "Selected area",
      latlng: near,
      radiusKm: searchRadiusKm(Number(params?.get("km"))),
    }
    : null;
  const date = params?.get("date") ?? null;

  return {
    city: city ?? null,
    place,
    whereLabel: place?.label ?? city?.label ?? cityParam ?? null,
    date,
    hasSets: params?.get("hasSets") === "true",
  };
}
