import Pill from "@/components/ui/Pill";

export type ListingKind = "STANDARD" | "CURATED";

const BADGES = {
    STANDARD: { label: "Verified", variant: "verified-button", border: "border-success/30" },
    CURATED: { label: "Curated", variant: "curated-button", border: "border-warning/30" },
} as const;

export default function ListingTypeBadge({ listingType }: { listingType: ListingKind }) {
    const badge = BADGES[listingType];
    return (
        <Pill
            label={badge.label}
            variant={badge.variant}
            size="xs"
            className={`bg-background/80 backdrop-blur-md text-[11px] font-semibold tracking-normal border ${badge.border}`}
        />
    );
}
