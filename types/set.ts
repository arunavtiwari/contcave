export type AdditionalSetPricingType = 'FIXED' | 'HOURLY';

export interface ListingSet {
    id: string;
    listingId: string;
    name: string;
    description?: string | null;
    images: string[];
    price: number;
    position: number;
    createdAt: string;
    updatedAt: string;
}



export interface ListingBlock {
    id: string;
    listingId: string;
    date: string;
    startTime: string;
    endTime: string;
    setIds: string[];
    reason?: string | null;
    createdAt: string;
}

export interface PricingBreakdown {
    baseHourlyRate: number;
    hours: number;
    baseCost: number;
    includedSetId: string | null;
    includedSetName: string | null;
    additionalSets: Array<{
        id: string;
        name: string;
        price: number;
    }>;
    additionalSetsCost: number;
    pricingType: AdditionalSetPricingType | null;
    packageId: string | null;
    packageTitle: string | null;
    packageAddOn: number;
    subtotal: number;
}

export interface PricingSnapshot {
    calculatedAt: string;
    baseHourlyRate: number;
    hours: number;
    roundingRule: 'ceil';
    selectedSetIds: string[];
    includedSetId: string | null;
    pricingType: AdditionalSetPricingType | null;
    additionalSetsCost: number;
    packageId: string | null;
    packageAddOn: number;
    subtotal: number;
    addonsTotal: number;
    platformFee: number;
    gstRate: number;
    gstAmount: number;
    total: number;
}

import { Package } from "@/types/package";

export interface SetPricingParams {
    baseHourlyRate: number;
    durationMinutes: number;
    selectedSetIds: string[];
    sets: ListingSet[];
    pricingType: AdditionalSetPricingType | null;
    selectedPackage?: Package | null;
}

export interface SetPricingResult {
    hours: number;
    baseCost: number;
    includedSetId: string | null;
    additionalSetsCost: number;
    packageAddOn: number;
    subtotal: number;
    breakdown: PricingBreakdown;
}
