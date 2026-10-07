import type { ReactNode } from "react";

import ListingTypeBadge, { type ListingKind } from "@/components/listing/ListingTypeBadge";

export const GROUP_LABELS = {
    bookable: "Book online",
    curated: "Enquire for price and dates",
} as const;

type SearchGroupHeadingProps = { id: string; label: string; badge?: ListingKind; action?: ReactNode };

export default function SearchGroupHeading({ id, label, badge, action }: SearchGroupHeadingProps) {
    return (
        <div className="flex items-center justify-between gap-3 px-3 pb-1.5 pt-3">
            <span id={id} className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
                {badge && <ListingTypeBadge listingType={badge} />}
                <span className="truncate">{label}</span>
            </span>
            {action}
        </div>
    );
}
