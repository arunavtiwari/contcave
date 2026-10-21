/**
 * Single source of truth for all listing taxonomy vocabularies.
 * Zod schemas, form selects, filter components, and the browse query
 * all import from here. No value for any axis may exist outside this file.
 */

export interface TaxonomyItem {
  slug: string;
  label: string;
  /** Optional heading the pickers group options under. Never stored. */
  group?: string;
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
  { slug: "workshop_class", label: "Workshops & Classes" },
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
  "Events & Pop-Ups": "Events & Pop-Ups",
  // legacy single-word slugs (service.ts legacyTypeMap)
  Workshop: "Workshops & Classes",
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
  { slug: "scandinavian", label: "Scandinavian" },
  { slug: "japandi", label: "Japandi" },
  { slug: "mediterranean", label: "Mediterranean" },
  { slug: "art_deco", label: "Art Deco" },
  { slug: "royal_heritage", label: "Royal & Heritage" },
  { slug: "tropical", label: "Tropical" },
  { slug: "monochrome", label: "Monochrome" },
  { slug: "cottagecore", label: "Cottagecore" },
  { slug: "futuristic_neon", label: "Futuristic & Neon" },
  { slug: "corporate_professional", label: "Corporate & Professional" },
  { slug: "playful_kids", label: "Playful & Kids" },
];

export const AESTHETIC_LABELS = AESTHETICS.map((a) => a.label) as [
  string,
  ...string[],
];

// ---------------------------------------------------------------------------
// Axis 4a — Set features  (stored in Listing.setFeatures and ListingSet.setFeatures)
// ---------------------------------------------------------------------------
// Labels are stored on listings and sets, so existing labels must never be renamed or removed;
// new options are appended. `group` only controls how pickers lay them out.
export const SET_FEATURES: TaxonomyItem[] = [
  // Lifestyle sets
  { slug: "kitchen_set", label: "Kitchen", group: "Lifestyle sets" },
  { slug: "living_room_set", label: "Living Room", group: "Lifestyle sets" },
  { slug: "bedroom_set", label: "Bedroom", group: "Lifestyle sets" },
  { slug: "dining_set", label: "Dining", group: "Lifestyle sets" },
  { slug: "bathroom_vanity_set", label: "Bathroom / Vanity", group: "Lifestyle sets" },
  { slug: "study_library_set", label: "Study / Library", group: "Lifestyle sets" },
  { slug: "home_office_set", label: "Home Office", group: "Lifestyle sets" },
  { slug: "kids_room_set", label: "Kids' Room", group: "Lifestyle sets" },
  { slug: "cafe_bar_counter", label: "Café / Bar Counter", group: "Lifestyle sets" },
  { slug: "boutique_retail_set", label: "Boutique / Retail", group: "Lifestyle sets" },
  { slug: "office_boardroom_set", label: "Office / Boardroom", group: "Lifestyle sets" },
  { slug: "heritage_royal_set", label: "Heritage / Royal", group: "Lifestyle sets" },
  { slug: "pool_set", label: "Pool", group: "Lifestyle sets" },
  { slug: "garden_set", label: "Garden", group: "Lifestyle sets" },
  { slug: "rooftop_terrace_set", label: "Rooftop / Terrace", group: "Lifestyle sets" },
  // Backdrops and walls
  { slug: "infinity_white_cyc", label: "Infinity White Cyc", group: "Backdrops & walls" },
  { slug: "cyclorama", label: "Cyclorama", group: "Backdrops & walls" },
  { slug: "coloured_backdrops", label: "Coloured Backdrops", group: "Backdrops & walls" },
  { slug: "green_screen", label: "Green Screen", group: "Backdrops & walls" },
  { slug: "paper_backdrops", label: "Paper Backdrops", group: "Backdrops & walls" },
  { slug: "printed_backdrops", label: "Printed Backdrops", group: "Backdrops & walls" },
  { slug: "white_walls", label: "White Walls", group: "Backdrops & walls" },
  { slug: "textured_wall", label: "Textured Wall", group: "Backdrops & walls" },
  { slug: "exposed_brick", label: "Exposed Brick", group: "Backdrops & walls" },
  { slug: "wooden_panels", label: "Wooden Panels", group: "Backdrops & walls" },
  { slug: "arches", label: "Arches", group: "Backdrops & walls" },
  // Light
  { slug: "natural_light", label: "Natural Light", group: "Light" },
  { slug: "skylight", label: "Skylight", group: "Light" },
  { slug: "blackout_controllable", label: "Blackout / Controllable", group: "Light" },
  { slug: "large_windows", label: "Large Windows", group: "Light" },
  // Space (flooring and raw space are kept because listings already use them)
  { slug: "multiple_sets", label: "Multiple Sets", group: "Space" },
  { slug: "movable_walls", label: "Movable Walls", group: "Space" },
  { slug: "high_ceilings", label: "High Ceilings", group: "Space" },
  { slug: "open_floor_plan", label: "Open Floor Plan", group: "Space" },
  { slug: "outdoor_area", label: "Outdoor Area", group: "Space" },
  { slug: "ground_floor_vehicle_access", label: "Ground Floor / Vehicle Access", group: "Space" },
  { slug: "raw_space", label: "Raw Space", group: "Space" },
  { slug: "hardwood_floor", label: "Hardwood Floor", group: "Space" },
  { slug: "concrete_floor", label: "Concrete Floor", group: "Space" },
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
