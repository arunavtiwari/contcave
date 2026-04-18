import { Listing } from "@prisma/client";

import { Addon } from "@/types/addon";
import { Package } from "@/types/package";
import { AdditionalSetPricingType, ListingBlock, ListingSet } from "@/types/set";
import { SafeUser } from "@/types/user";

export type safeListing = Omit<Listing, "createdAt" | "addons" | "packages" | "operationalDays" | "operationalHours" | "actualLocation"> & {
    createdAt: string;
    addons?: unknown;
    packages?: unknown;
    operationalDays?: unknown;
    operationalHours?: unknown;
    actualLocation?: unknown;
    avgReviewRating?: number;
};

export type ActualLocation = {
    lat: number;
    lng: number;
    address: string;
    additionalInfo?: string;
    [key: string]: unknown;
};

export type FullListing = Omit<safeListing, "addons" | "packages" | "operationalDays" | "operationalHours" | "carpetArea" | "maximumPax" | "minimumBookingHours" | "actualLocation" | "avgReviewRating" | "instantBooking"> & {
    addons: Addon[];
    packages: Package[];
    operationalDays?: { start?: string; end?: string };
    operationalHours?: { start?: string; end?: string };
    carpetArea?: number;
    maximumPax?: number;
    minimumBookingHours?: number;
    type?: string[];
    avgReviewRating?: number;
    actualLocation?: ActualLocation | null;
    otherAmenities?: string[];
    description: string;
    category: string;
    locationValue: string;
    imageSrc: string[];
    title: string;
    price: number;
    instantBooking?: boolean;
    user: SafeUser;
    hasSets?: boolean;
    setsHaveSamePrice?: boolean;
    unifiedSetPrice?: number | null;
    additionalSetPricingType?: AdditionalSetPricingType | null;
    customTerms?: string | null;

    sets?: ListingSet[];
    blocks?: ListingBlock[];
};

