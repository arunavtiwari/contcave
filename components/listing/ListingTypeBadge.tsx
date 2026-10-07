import Pill from "@/components/ui/Pill";
import { cn } from "@/lib/utils";

export type ListingKind = "STANDARD" | "CURATED";

const BADGES = {
    STANDARD: { label: "Verified", variant: "verified-button", border: "border-success/30" },
    CURATED: { label: "Curated", variant: "curated-button", border: "border-warning/30" },
} as const;

export default function ListingTypeBadge({ listingType, className }: { listingType: ListingKind; className?: string }) {
    const badge = BADGES[listingType];
    return (
        <Pill
            label={badge.label}
            variant={badge.variant}
            size="xs"
            className={cn("border text-[11px] font-semibold tracking-normal", badge.border, className)}
        />
    );
}
