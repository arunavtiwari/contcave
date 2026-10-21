import Pill from "@/components/ui/Pill";
import {
    type EquipmentItem,
    type EquipmentPolicy,
    floorChip,
    LIGHTING_TIER_LABELS,
    lightingTier,
    type ListingAccess,
} from "@/lib/listing/equipment";

type Props = {
    carpetArea?: number | null;
    maximumPax?: number | null;
    access: ListingAccess | null;
    equipment: { policy: EquipmentPolicy | null; items: EquipmentItem[] } | null;
};

/**
 * Chips under the title: sq ft · max pax · floor and lift · lighting tier.
 * Only rendered once the listing has floor or lighting data, so listings that haven't been
 * backfilled look exactly as they did before.
 */
export default function ListingQuickFacts({ carpetArea, maximumPax, access, equipment }: Props) {
    const floor = floorChip(access);
    const tier = equipment?.policy === "all_bookings" ? lightingTier(equipment.items) : null;
    if (!floor && !tier) return null;

    return (
        <div className="flex flex-wrap items-center gap-2" aria-label="Quick facts">
            {carpetArea ? <Pill label={`${carpetArea.toLocaleString("en-IN")} sq ft`} variant="outline" size="sm" /> : null}
            {maximumPax ? <Pill label={`Up to ${maximumPax} pax`} variant="outline" size="sm" /> : null}
            {floor && <Pill label={floor.label} variant={floor.warning ? "warning" : "outline"} size="sm" />}
            {tier && <Pill label={LIGHTING_TIER_LABELS[tier]} variant="success" size="sm" />}
        </div>
    );
}
