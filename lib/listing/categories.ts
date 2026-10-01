import { CATEGORY_TO_VENUE_TYPES, normaliseUseCase, USE_CASE_LABELS, USE_CASE_LEGACY_MAP } from "@/lib/taxonomy";

export type StudioCategory = {
  slug: string;
  name: string;
  noun: string;
  useCases?: string[];
  venueTypes?: string[];
};

export const STUDIO_CATEGORIES: StudioCategory[] = [
  { slug: "podcast-studios", name: "Podcast Studios", noun: "podcast studio", useCases: ["Podcast & Interview"], venueTypes: ["Podcast Studio"] },
  { slug: "photo-studios", name: "Photo Studios", noun: "photo studio", venueTypes: ["Shoot Studio"] },
  { slug: "product-shoot-studios", name: "Product Shoot Studios", noun: "product shoot studio", useCases: ["Product & E-commerce"] },
  { slug: "fashion-shoot-studios", name: "Fashion Shoot Studios", noun: "fashion shoot studio", useCases: ["Fashion & Lifestyle"] },
  { slug: "video-shoot-studios", name: "Video Shoot Studios", noun: "video shoot studio", useCases: ["Video & Film"] },
  { slug: "reels-studios", name: "Reels & Content Studios", noun: "reels and content studio", useCases: ["UGC & Reels"] },
  { slug: "pre-wedding-shoot-locations", name: "Pre-Wedding Shoot Locations", noun: "pre-wedding shoot location", useCases: ["Pre-Wedding"] },
  { slug: "food-shoot-studios", name: "Food Shoot Studios", noun: "food shoot studio", useCases: ["Food & Beverage"] },
  { slug: "event-spaces", name: "Event Spaces", noun: "event space", useCases: ["Events & Pop-Ups"], venueTypes: ["Event Space"] },
  { slug: "recording-studios", name: "Recording Studios", noun: "recording studio", useCases: ["Music Recording"], venueTypes: ["Recording Studio"] },
  { slug: "rooftop-outdoor-shoot-locations", name: "Rooftop & Outdoor Shoot Locations", noun: "rooftop or outdoor shoot location", venueTypes: ["Outdoor / Rooftop"] },
];

export const MIN_CATEGORY_LISTINGS = 3;

export const findCategory = (slug: string) => STUDIO_CATEGORIES.find((category) => category.slug === slug);

type Taxonomised = { type?: string[] | null; venueTypes?: string[] | null; category?: string | null };

export function matchesCategory(listing: Taxonomised, category: StudioCategory) {
  const useCases = (listing.type ?? []).map(normaliseUseCase);
  const venueTypes = listing.venueTypes?.length
    ? listing.venueTypes
    : CATEGORY_TO_VENUE_TYPES[listing.category ?? ""]?.venueTypes ?? [];
  return Boolean(
    category.useCases?.some((useCase) => useCases.includes(useCase)) ||
    category.venueTypes?.some((venueType) => venueTypes.includes(venueType))
  );
}

export const categoriesOf = (listing: Taxonomised) =>
  STUDIO_CATEGORIES.filter((category) => matchesCategory(listing, category));

const RAW_USE_CASES = Array.from(new Set([...USE_CASE_LABELS, ...Object.keys(USE_CASE_LEGACY_MAP)]));

const NO_VENUE_TYPES = { $or: [{ venueTypes: { $exists: false } }, { venueTypes: null }, { venueTypes: { $size: 0 } }] };

export function categoryMatch(category: StudioCategory): Record<string, unknown> {
  const useCases = RAW_USE_CASES.filter((raw) => {
    const useCase = normaliseUseCase(raw);
    return useCase !== null && Boolean(category.useCases?.includes(useCase));
  });
  const venueTypes = category.venueTypes ?? [];
  const legacyCategories = Object.entries(CATEGORY_TO_VENUE_TYPES)
    .filter(([, mapped]) => mapped.venueTypes.some((venueType) => venueTypes.includes(venueType)))
    .map(([legacy]) => legacy);

  return {
    $or: [
      ...(useCases.length ? [{ type: { $in: useCases } }] : []),
      ...(venueTypes.length ? [{ venueTypes: { $in: venueTypes } }] : []),
      ...(legacyCategories.length ? [{ $and: [NO_VENUE_TYPES, { category: { $in: legacyCategories } }] }] : []),
    ],
  };
}
