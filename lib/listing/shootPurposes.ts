import { normaliseUseCase, SET_FEATURES, USE_CASE_LABELS, USE_CASE_LEGACY_MAP } from "@/lib/taxonomy";

/**
 * The main "what's the shoot?" filter on /studios and city pages.
 *
 * Purposes aren't stored on listings. Each one is matched against tags listings already carry
 * (shoot types, venue types, and set features on the listing or any of its sets), so adding or
 * reshaping a purpose never touches stored data.
 */
export type ShootPurpose = {
    slug: string;
    label: string;
    description: string;
    useCases?: string[];
    venueTypes?: string[];
    setFeatures?: string[];
    /**
     * Also match every listing that isn't specifically a specialist space (one that only matches
     * podcast, recording, event, workshop or co-working). Used by Styled Shoots.
     */
    includeNonSpecialists?: boolean;
    /** A specialist purpose: matching only these keeps a listing out of Styled Shoots. */
    specialist?: boolean;
    /** Kept for matching rules but not shown in the filter bar. */
    hidden?: boolean;
};

export const SHOOT_PURPOSES: ShootPurpose[] = [
    {
        // Brand shoots, editorial, reels, pre-wedding. Every studio unless it's specifically a
        // podcast, recording, event, workshop or co-working space.
        slug: "styled",
        label: "Styled Shoots",
        description: "Campaigns, fashion, lifestyle",
        useCases: ["Fashion & Lifestyle", "Portrait & Editorial", "UGC & Reels", "Pre-Wedding", "Video & Film", "Food & Beverage", "Product & E-commerce"],
        venueTypes: ["Home-Style Set", "Café / Restaurant", "Outdoor / Rooftop"],
        setFeatures: SET_FEATURES.filter((feature) => feature.group === "Lifestyle sets").map((feature) => feature.label),
        includeNonSpecialists: true,
    },
    {
        // Catalogue, e-com, portfolios
        slug: "backdrop",
        label: "Backdrop Shoots",
        description: "Cyc, coloured backdrops, green screen",
        setFeatures: ["Cyclorama", "Infinity White Cyc", "Green Screen", "Coloured Backdrops"],
    },
    {
        // Podcasts, interviews
        slug: "podcast",
        label: "Podcasts",
        description: "Ready podcast setups",
        useCases: ["Podcast & Interview"],
        venueTypes: ["Podcast Studio"],
        specialist: true,
    },
    {
        // Music, dubbing, VO
        slug: "recording",
        label: "Recording",
        description: "Music & voice",
        useCases: ["Music Recording"],
        venueTypes: ["Recording Studio"],
        specialist: true,
    },
    {
        // Events, screenings, workshops, masterclasses
        slug: "event",
        label: "Events & Workshops",
        description: "Launches, pop-ups, classes",
        useCases: ["Events & Pop-Ups", "Workshops & Classes"],
        venueTypes: ["Event Space"],
        specialist: true,
    },
    {
        // Not a focus vertical, so it's out of the filter bar; still a specialist space,
        // which keeps co-working-only listings out of Styled Shoots.
        slug: "coworking",
        label: "Co-working",
        description: "Day desks, meetings",
        venueTypes: ["Co-working"],
        specialist: true,
        hidden: true,
    },
];

export const findShootPurpose = (slug: string | null | undefined) =>
    SHOOT_PURPOSES.find((purpose) => purpose.slug === slug);

const RAW_USE_CASES = Array.from(new Set([...USE_CASE_LABELS, ...Object.keys(USE_CASE_LEGACY_MAP)]));

/** Stored Listing.type values (current and legacy spellings) that count toward a purpose. */
export function storedUseCasesFor(purpose: ShootPurpose): string[] {
    return RAW_USE_CASES.filter((raw) => {
        const useCase = normaliseUseCase(raw);
        return useCase !== null && Boolean(purpose.useCases?.includes(useCase));
    });
}

/**
 * Mongo match for a purpose. `setListingIds` are listings whose *sets* carry one of the
 * purpose's set features; sets live in their own collection, so the caller looks those up.
 */
function tagBranches(purpose: ShootPurpose, setListingIds: string[] = []): Record<string, unknown>[] {
    const useCases = storedUseCasesFor(purpose);
    return [
        ...(useCases.length ? [{ type: { $in: useCases } }] : []),
        ...(purpose.venueTypes?.length ? [{ venueTypes: { $in: purpose.venueTypes } }] : []),
        ...(purpose.setFeatures?.length ? [{ setFeatures: { $in: purpose.setFeatures } }] : []),
        ...(setListingIds.length ? [{ _id: { $in: setListingIds.map((id) => ({ $oid: id })) } }] : []),
    ];
}

export function shootPurposeMatch(purpose: ShootPurpose, setListingIds: string[] = []): Record<string, unknown> {
    const branches = tagBranches(purpose, setListingIds);
    if (purpose.includeNonSpecialists) {
        // Not tagged for any specialist use at all, e.g. a plain shoot studio.
        const specialistBranches = SHOOT_PURPOSES.filter((other) => other.specialist).flatMap((other) => tagBranches(other));
        branches.push({ $nor: specialistBranches });
    }
    // An $or needs at least one branch; a purpose nothing can match yet matches nothing.
    return { $or: [...branches, { _id: { $in: [] } }] };
}
