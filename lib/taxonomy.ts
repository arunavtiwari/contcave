/**
 * Single source of truth for all listing taxonomy vocabularies.
 * Zod schemas, form selects, filter components, and the browse query
 * all import from here. No value for any axis may exist outside this file.
 */

export interface TaxonomyItem {
  slug: string;
  label: string;
}

// ---------------------------------------------------------------------------
// Axis 1 — Use-case / Shoot type  (stored in Listing.type String[])
// ---------------------------------------------------------------------------
export const USE_CASES: TaxonomyItem[] = [
  { slug: "product", label: "Product & E-commerce" },
  { slug: "fashion_lifestyle", label: "Fashion & Lifestyle" },
  { slug: "food_beverage", label: "Food & Beverage" },
  { slug: "portrait_editorial", label: "Portrait & Editorial" },
  { slug: "pre_wedding", label: "Pre-Wedding" },
  { slug: "video_film", label: "Video & Film" },
  { slug: "podcast_interview", label: "Podcast & Interview" },
  { slug: "ugc_reels", label: "UGC & Reels" },
  { slug: "event_party", label: "Events & Pop-Ups" },
  { slug: "sound_recording", label: "Music Recording" },
];

/** Labels stored in DB for axis-1 (Listing.type) */
export const USE_CASE_LABELS = USE_CASES.map((u) => u.label) as [
  string,
  ...string[],
];

/**
 * Legacy label → new label mapping for Listing.type normalisation.
 * Used by the listing service on read, and by the migration script.
 */
export const USE_CASE_LEGACY_MAP: Record<string, string | null> = {
  // old verbose labels
  "Fashion Shoot": "Fashion & Lifestyle",
  "Product & E-commerce Shoot": "Product & E-commerce",
  "Reels & Social Media Content": "UGC & Reels",
  "YouTube Videos": "UGC & Reels",
  "Podcast Recording": "Podcast & Interview",
  "Video Production": "Video & Film",
  "Film & Music Video Shoot": "Video & Film",
  "Brand Campaign Shoot": "Video & Film",
  "Pre-Wedding Shoot": "Pre-Wedding",
  "Workshops & Classes": "Events & Pop-Ups",
  "Events & Pop-Ups": "Events & Pop-Ups",
  // legacy single-word slugs (service.ts legacyTypeMap)
  Workshop: "Events & Pop-Ups",
  Podcast: "Podcast & Interview",
  Interview: "Podcast & Interview",
  Meeting: null, // drop
  "Meetings & Creative Sessions": null, // drop
  "Interviews & YouTube Videos": "UGC & Reels",
};

// ---------------------------------------------------------------------------
// Axis 2 — Venue type  (stored in Listing.venueTypes String[])
// ---------------------------------------------------------------------------
export const VENUE_TYPES: TaxonomyItem[] = [
  { slug: "shoot_studio", label: "Shoot Studio" },
  { slug: "home_style", label: "Home-Style Set" },
  { slug: "cafe_restaurant", label: "Café / Restaurant" },
  { slug: "event_space", label: "Event Space" },
  { slug: "coworking", label: "Co-working" },
  { slug: "recording_studio", label: "Recording Studio" },
  { slug: "podcast_studio", label: "Podcast Studio" },
  { slug: "outdoor_rooftop", label: "Outdoor / Rooftop" },
];

export const VENUE_TYPE_LABELS = VENUE_TYPES.map((v) => v.label) as [
  string,
  ...string[],
];

/**
 * Legacy Listing.category value → venueTypes labels.
 * Also notes when a category implies a setFeature (e.g. Cyclorama Studio → setFeatures: ["Cyclorama"]).
 */
export const CATEGORY_TO_VENUE_TYPES: Record<
  string,
  { venueTypes: string[]; setFeatures?: string[] }
> = {
  "Indoor Studio": { venueTypes: ["Shoot Studio"] },
  "Outdoor Studio": { venueTypes: ["Outdoor / Rooftop"] },
  "Podcast Studio": { venueTypes: ["Podcast Studio"] },
  "Cafe / Restaurant": { venueTypes: ["Café / Restaurant"] },
  "Recording Studio": { venueTypes: ["Recording Studio"] },
  "Home-Style Setup": { venueTypes: ["Home-Style Set"] },
  "Event Space": { venueTypes: ["Event Space"] },
  "Co-working Space": { venueTypes: ["Co-working"] },
  // Cyclorama → venue is Shoot Studio, plus setFeature
  "Cyclorama Studio": {
    venueTypes: ["Shoot Studio"],
    setFeatures: ["Cyclorama"],
  },
};

// ---------------------------------------------------------------------------
// Axis 3 — Aesthetics  (stored in Listing.aesthetics and ListingSet.aesthetics)
// ---------------------------------------------------------------------------
export const AESTHETICS: TaxonomyItem[] = [
  { slug: "industrial", label: "Industrial" },
  { slug: "indian_traditional", label: "Indian Traditional" },
  { slug: "minimalist_white", label: "Minimalist & White" },
  { slug: "boho", label: "Boho" },
  { slug: "vibrant_bold", label: "Vibrant & Bold" },
  { slug: "warm_earthy", label: "Warm & Earthy" },
  { slug: "luxury_opulent", label: "Luxury & Opulent" },
  { slug: "rustic", label: "Rustic" },
  { slug: "modern_contemporary", label: "Modern & Contemporary" },
  { slug: "vintage_retro", label: "Vintage & Retro" },
  { slug: "pastel", label: "Pastel" },
  { slug: "dark_moody", label: "Dark & Moody" },
  { slug: "natural_greenery", label: "Natural & Greenery" },
  { slug: "editorial_architectural", label: "Editorial & Architectural" },
];

export const AESTHETIC_LABELS = AESTHETICS.map((a) => a.label) as [
  string,
  ...string[],
];

// ---------------------------------------------------------------------------
// Axis 4a — Set features  (stored in Listing.setFeatures and ListingSet.setFeatures)
// ---------------------------------------------------------------------------
export const SET_FEATURES: TaxonomyItem[] = [
  { slug: "cyclorama", label: "Cyclorama" },
  { slug: "infinity_white_cyc", label: "Infinity White Cyc" },
  { slug: "green_screen", label: "Green Screen" },
  { slug: "natural_light", label: "Natural Light" },
  { slug: "blackout_controllable", label: "Blackout / Controllable" },
  { slug: "skylight", label: "Skylight" },
  { slug: "paper_backdrops", label: "Paper Backdrops" },
  { slug: "coloured_backdrops", label: "Coloured Backdrops" },
  { slug: "printed_backdrops", label: "Printed Backdrops" },
  { slug: "high_ceilings", label: "High Ceilings" },
  { slug: "exposed_brick", label: "Exposed Brick" },
  { slug: "white_walls", label: "White Walls" },
  { slug: "wooden_panels", label: "Wooden Panels" },
  { slug: "hardwood_floor", label: "Hardwood Floor" },
  { slug: "concrete_floor", label: "Concrete Floor" },
  { slug: "open_floor_plan", label: "Open Floor Plan" },
  { slug: "raw_space", label: "Raw Space" },
];

export const SET_FEATURE_LABELS = SET_FEATURES.map((f) => f.label) as [
  string,
  ...string[],
];

// ---------------------------------------------------------------------------
// Axis 4b — Facility amenities  (vocab reference; stored via existing amenities/otherAmenities)
// These are the canonical labels that should exist in the Amenities DB model.
// ---------------------------------------------------------------------------
export const FACILITY_AMENITIES: TaxonomyItem[] = [
  { slug: "air_conditioned", label: "Air Conditioned" },
  { slug: "restroom", label: "Restroom" },
  { slug: "changing_room", label: "Changing Room" },
  { slug: "makeup_vanity", label: "Makeup Vanity" },
  { slug: "lounge", label: "Lounge Area" },
  { slug: "kitchen_pantry", label: "Kitchen / Pantry" },
  { slug: "parking", label: "Parking" },
  { slug: "freight_lift", label: "Freight Lift" },
  { slug: "drive_in_access", label: "Drive-In Access" },
  { slug: "wifi", label: "Wi-Fi" },
  { slug: "access_24_7", label: "24/7 Access" },
  { slug: "soundproofed", label: "Soundproofed" },
  { slug: "wheelchair_accessible", label: "Wheelchair Accessible" },
  { slug: "pet_friendly", label: "Pet Friendly" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a label to its TaxonomyItem from any axis. Returns undefined if not found. */
export function findByLabel(
  items: TaxonomyItem[],
  label: string,
): TaxonomyItem | undefined {
  return items.find((i) => i.label === label);
}

/** Resolve a slug to its TaxonomyItem from any axis. */
export function findBySlug(
  items: TaxonomyItem[],
  slug: string,
): TaxonomyItem | undefined {
  return items.find((i) => i.slug === slug);
}

/**
 * Normalise a raw Listing.type value to the current axis-1 label.
 * Returns null if the value is deprecated / should be dropped.
 */
export function normaliseUseCase(raw: string): string | null {
  if (USE_CASE_LABELS.includes(raw as string)) return raw;
  const mapped = USE_CASE_LEGACY_MAP[raw];
  return mapped ?? null;
}
