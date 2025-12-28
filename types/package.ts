export interface Package {
    id?: string;
    title: string;
    originalPrice: number;
    offeredPrice: number;
    features: string[];
    durationHours: number;
}
