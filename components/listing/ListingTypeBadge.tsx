import Pill from "@/components/ui/Pill";

export type ListingKind = "STANDARD" | "CURATED";

const BADGES = {
    STANDARD: { label: "Verified", tone: "positive" },
    CURATED: { label: "Curated", tone: "pending" },
} as const;

export default function ListingTypeBadge({ listingType }: { listingType: ListingKind }) {
    const badge = BADGES[listingType];
    return <Pill label={badge.label} variant="glass" size="sm" tone={badge.tone} className="text-xs font-medium" />;
}
