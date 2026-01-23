export interface Package {
    id?: string;
    title: string;
    description?: string | null;
    originalPrice: number;
    offeredPrice: number;
    features: string[];
    durationHours: number;
    requiredSetCount?: number | null;

    fixedAddOn?: number | null;
    eligibleSetIds?: string[];
    isActive?: boolean;
}
