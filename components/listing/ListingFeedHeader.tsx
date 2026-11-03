"use client";

import BrowseResultLine from "@/components/listing/BrowseResultLine";
import LocationCombobox from "@/components/listing/LocationCombobox";
import SortMenu from "@/components/listing/SortMenu";
import { useFeedSummary } from "@/hooks/useFeedSummary";

export default function ListingFeedHeader({ title = "Explore studios" }: { title?: string }) {
    const { nearLabel } = useFeedSummary();

    const heading = () => {
        if (!nearLabel) return title;
        const normalized = nearLabel.toLowerCase().trim();
        if (normalized === "nearby" || normalized === "you" || normalized === "current location") {
            return "Studios nearby";
        }
        return `Studios near ${nearLabel}`;
    };

    return (
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">{heading()}</h1>
                <BrowseResultLine />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
                <LocationCombobox />
                <SortMenu />
            </div>
        </div>
    );
}
