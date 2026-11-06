import "server-only";

import { unstable_cache } from "next/cache";

import { type CityEntry, getCityDirectory } from "@/lib/listing/cities";
import { listingPath } from "@/lib/listing/seo";
import { ListingService } from "@/lib/listing/service";
import type { BlogPost } from "@/types/blog";

const MAX_STUDIOS = 6;
const MIN_STUDIOS = 3;

const CITY_ALIASES: Record<string, string[]> = {
  delhi: ["delhi", "delhi ncr", "new delhi", "ncr"],
  gurugram: ["gurugram", "gurgaon"],
  bengaluru: ["bengaluru", "bangalore"],
  mumbai: ["mumbai", "bombay"],
};

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "your", "india", "studio", "studios", "creators", "creator", "content",
  "creation", "tips", "guide", "how", "best", "rent", "rental", "growth", "shoot", "shoots", "shooting",
]);

export type BlogStudio = {
  id: string;
  title: string;
  href: string;
  image?: string;
  city?: string;
  kind?: string;
};

export type BlogStudios = {
  studios: BlogStudio[];
  city?: { name: string; href: string };
};

type StudioRow = BlogStudio & { haystack: string; rating: number; cityKey: string };

const loadStudioRows = unstable_cache(
  async (): Promise<StudioRow[]> => {
    const listings = await ListingService.getListings({});
    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title.trim(),
      href: listingPath(listing),
      image: listing.imageSrc?.[0],
      city: listing.locationValue?.trim() || undefined,
      kind: listing.venueTypes?.[0] || listing.category || undefined,
      cityKey: listing.locationValue?.trim().toLowerCase() ?? "",
      rating: listing.avgReviewRating ?? 0,
      haystack: [listing.title, listing.category, ...(listing.venueTypes ?? [])].join(" ").toLowerCase(),
    }));
  },
  ["blog-studio-rows"],
  { revalidate: 3600 }
);

const postText = (post: BlogPost) =>
  [
    post.title,
    ...(post.tags ?? []),
    ...(post.categories ?? []).map((category) => category.title),
    ...(post.layout ?? []).flatMap((block) => [block.content ?? "", ...(block.items ?? [])]),
  ]
    .join(" ")
    .toLowerCase();

const namesFor = (entry: CityEntry) => {
  const key = entry.city.toLowerCase();
  const alias = Object.entries(CITY_ALIASES).find(([, names]) => names.includes(key));
  return alias ? alias[1] : [key];
};

const countMentions = (text: string, name: string) =>
  text.match(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"))?.length ?? 0;

const pickCity = (post: BlogPost, directory: CityEntry[]) => {
  const heading = `${post.title} ${(post.tags ?? []).join(" ")}`.toLowerCase();
  const body = postText(post);
  let best: { entry: CityEntry; score: number } | undefined;
  for (const entry of directory) {
    const names = namesFor(entry);
    const score = names.reduce((sum, name) => sum + countMentions(heading, name) * 5 + countMentions(body, name), 0);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry;
};

const topicWords = (post: BlogPost) =>
  Array.from(
    new Set(
      [post.title, ...(post.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
    )
  );

export async function getStudiosForPost(post: BlogPost): Promise<BlogStudios> {
  const [rows, directory] = await Promise.all([loadStudioRows(), getCityDirectory()]);
  if (!rows.length) return { studios: [] };

  const cityEntry = pickCity(post, directory);
  const cityNames = cityEntry ? namesFor(cityEntry) : [];
  const words = topicWords(post);

  const ranked = rows
    .map((row) => ({
      row,
      inCity: cityEntry ? row.cityKey === cityEntry.city.toLowerCase() || cityNames.includes(row.cityKey) : false,
      topic: words.filter((word) => row.haystack.includes(word)).length,
    }))
    .sort((a, b) => Number(b.inCity) - Number(a.inCity) || b.topic - a.topic || b.row.rating - a.row.rating);

  const inCity = ranked.filter((entry) => entry.inCity);
  const pool = inCity.length >= MIN_STUDIOS ? inCity : ranked;

  const studios = pool.slice(0, MAX_STUDIOS).map(({ row }) => ({
    id: row.id,
    title: row.title,
    href: row.href,
    image: row.image,
    city: row.city,
    kind: row.kind,
  }));

  const cityForLink = cityEntry ?? directory[0];
  return {
    studios,
    city: cityForLink ? { name: cityForLink.city, href: `/studios/${cityForLink.slug}` } : undefined,
  };
}
