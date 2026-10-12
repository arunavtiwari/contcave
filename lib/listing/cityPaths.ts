import { joinList } from "@/lib/strings";

export const cityWithState = (city: string, state?: string | null) =>
  state && state !== city ? `${city}, ${state}` : city;

export const coverageArea = (places: string[]) => (places.length ? `in ${joinList(places)}` : "across India");

export const citySlug = (city: string) =>
  city
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const cityPath = (city: string) => `/studios/${citySlug(city)}`;

export const cityCategoryPath = (city: string, category: { slug: string }) =>
  `${cityPath(city)}/${category.slug}`;
