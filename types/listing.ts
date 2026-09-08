import type { Listing } from "@prisma/client";

import type { Addon } from "@/types/addon";
import type { Package } from "@/types/package";
import type { AdditionalSetPricingType, ListingBlock, ListingSet } from "@/types/set";
import type { PublicUser } from "@/types/user";

export type safeListing = Omit<
    Listing,
    | "createdAt"
    | "addons"
    | "packages"
    | "operationalDays"
    | "operationalHours"
    | "actualLocation"
    | "verifications"
    | "reviewedAt"
    | "reviewedById"
    | "rejectionReason"
    | "curatedSource"
    | "contactEmail"
    | "notifyEmailSentAt"
    | "notifyReminderAt"
    | "inConversation"
    | "enquiryCount"
    | "accountDeactivatedAt"
    | "archivedAt"
    | "archivedById"
    | "avgReviewRating"
> & {
    createdAt: string;
    addons?: Addon[] | null;
    packages?: Package[] | null;
    operationalDays?: { start?: string; end?: string } | null;
    operationalHours?: { start?: string; end?: string } | null;
    actualLocation?: ActualLocation | null;
    avgReviewRating?: number;
    videoSrc?: string | null;
};

export type ActualLocation = {
    lat?: number;
    lng?: number;
    latlng: [number, number];
    address?: string;
    label?: string;
    region?: string;
    state?: string;
    value?: string;
    flag?: string;
    country?: string;
    display_name?: string;
    propertyStateCode?: string;
    additionalInfo?: string;
    url?: string;
    mapsUrl?: string;
    googleMapsUrl?: string;
};

export type FullListing = Omit<safeListing, "addons" | "packages" | "operationalDays" | "operationalHours" | "actualLocation" | "avgReviewRating"> & {
    addons: Addon[];
    packages: Package[];
    operationalDays?: { start?: string; end?: string };
    operationalHours?: { start?: string; end?: string };
    type?: string[];
    avgReviewRating?: number;
    actualLocation?: ActualLocation | null;
    otherAmenities?: string[];
    description: string;
    category: string;
    locationValue: string;
    imageSrc: string[];
    title: string;
    price?: number | null;
    contactEmail?: string | null;
    user: PublicUser;
    hasSets?: boolean;
    setsHaveSamePrice?: boolean;
    unifiedSetPrice?: number | null;
    additionalSetPricingType?: AdditionalSetPricingType | null;
    customTerms?: string | null;

    sets?: ListingSet[];
    blocks?: ListingBlock[];
    videoSrc?: string | null;

    // Taxonomy axes
    venueTypes?: string[];
    aesthetics?: string[];
    setFeatures?: string[];

    // Curated listing fields
    listingType?: "STANDARD" | "CURATED";
    mapsUrl?: string | null;
    websiteUrl?: string | null;
    instagramHandle?: string | null;
    priceRangeMin?: number | null;
    priceRangeMax?: number | null;
};

export type ListingBlockData = {
    date: string;
    startTime: string;
    endTime: string;
    setIds: string[];
    reason?: string | null;
};
