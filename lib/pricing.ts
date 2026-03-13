import { Package } from "@/types/package";
import {
    AdditionalSetPricingType,
    ListingSet,
    PricingBreakdown,
    SetPricingParams,
    SetPricingResult,
} from "@/types/set";


export function calculateHours(durationMinutes: number): number {
    if (durationMinutes <= 0) return 1;
    return Math.ceil(durationMinutes / 60);
}


export function calculateBaseCost(baseHourlyRate: number, hours: number): number {
    return Math.round(baseHourlyRate * hours);
}


export function findIncludedSet(
    selectedSetIds: string[],
    sets: ListingSet[]
): ListingSet | null {
    if (selectedSetIds.length === 0) return null;

    const selectedSets = sets
        .filter((s) => selectedSetIds.includes(s.id))
        .sort((a, b) => {
            if (a.price !== b.price) return a.price - b.price;
            return a.position - b.position;
        });

    return selectedSets[0] || null;
}


export function calculateAdditionalSetsCost(
    selectedSetIds: string[],
    includedSetId: string | null,
    sets: ListingSet[],
    pricingType: AdditionalSetPricingType | null,
    hours: number
): { additionalSets: Array<{ id: string; name: string; price: number }>; totalCost: number } {
    if (selectedSetIds.length <= 1 || !includedSetId) {
        return { additionalSets: [], totalCost: 0 };
    }

    const additionalSetIds = selectedSetIds.filter((id) => id !== includedSetId);
    const additionalSets = sets
        .filter((s) => additionalSetIds.includes(s.id))
        .map((s) => ({ id: s.id, name: s.name, price: s.price }));

    let totalCost = 0;
    if (pricingType === "FIXED") {
        totalCost = additionalSets.reduce((sum, s) => sum + s.price, 0);
    } else if (pricingType === "HOURLY") {
        const addOnsPerHour = additionalSets.reduce((sum, s) => sum + s.price, 0);
        totalCost = addOnsPerHour * hours;
    }

    return { additionalSets, totalCost: Math.round(totalCost) };
}


export function calculateSetPricing(params: SetPricingParams): SetPricingResult {
    const {
        baseHourlyRate,
        durationMinutes,
        selectedSetIds,
        sets,
        pricingType,
        selectedPackage,
    } = params;

    const hours = calculateHours(durationMinutes);
    const baseCost = calculateBaseCost(baseHourlyRate, hours);

    const includedSet = findIncludedSet(selectedSetIds, sets);
    const includedSetId = includedSet?.id || null;

    let additionalSetsCost = 0;
    let additionalSets: Array<{ id: string; name: string; price: number }> = [];
    let packageAddOn = 0;
    let subtotal = baseCost;

    if (selectedPackage) {
        packageAddOn = selectedPackage.fixedAddOn || 0;
        subtotal = baseCost + packageAddOn;
    } else if (selectedSetIds.length > 0) {
        const additionalResult = calculateAdditionalSetsCost(
            selectedSetIds,
            includedSetId,
            sets,
            pricingType,
            hours
        );
        additionalSets = additionalResult.additionalSets;
        additionalSetsCost = additionalResult.totalCost;
        subtotal = baseCost + additionalSetsCost;
    }

    const breakdown: PricingBreakdown = {
        baseHourlyRate,
        hours,
        baseCost,
        includedSetId,
        includedSetName: includedSet?.name || null,
        additionalSets,
        additionalSetsCost,
        pricingType,
        packageId: selectedPackage?.id || null,
        packageTitle: selectedPackage?.title || null,
        packageAddOn,
        subtotal,
    };

    return {
        hours,
        baseCost,
        includedSetId,
        additionalSetsCost,
        packageAddOn,
        subtotal,
        breakdown,
    };
}


export function validateSetSelection(
    selectedSetIds: string[],
    selectedPackage?: Package | null
): { valid: boolean; error?: string } {




    const count = selectedSetIds.length;

    if (selectedPackage && selectedPackage.requiredSetCount) {
        if (count !== selectedPackage.requiredSetCount) {
            return {
                valid: false,
                error: `Package "${selectedPackage.title}" requires exactly ${selectedPackage.requiredSetCount} set(s). You selected ${count}.`,
            };
        }
    }

    if (selectedPackage) {
        if (selectedPackage.eligibleSetIds && selectedPackage.eligibleSetIds.length > 0) {
            const invalidSets = selectedSetIds.filter(
                (id) => !selectedPackage.eligibleSetIds?.includes(id)
            );
            if (invalidSets.length > 0) {
                return {
                    valid: false,
                    error: `Some selected sets are not eligible for this package.`,
                };
            }
        }
    }

    return { valid: true };
}


export function calculateBookingTotal(params: {
    setSubtotal: number;
    addonsTotal: number;
    platformFee: number;
    gstRate?: number;
}): { subtotal: number; gstAmount: number; total: number } {
    const { setSubtotal, addonsTotal, platformFee, gstRate = 0.18 } = params;
    const subtotal = setSubtotal + addonsTotal + platformFee;
    const gstAmount = Math.round(subtotal * gstRate);
    const total = subtotal + gstAmount;
    return { subtotal, gstAmount, total };
}
