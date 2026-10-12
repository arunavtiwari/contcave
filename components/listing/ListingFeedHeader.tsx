"use client";

import BrowseControlBar from "@/components/listing/BrowseControlBar";
import BrowseResultLine from "@/components/listing/BrowseResultLine";
import LocationCombobox from "@/components/listing/LocationCombobox";
import LocationSheet from "@/components/listing/LocationSheet";
import SortMenu from "@/components/listing/SortMenu";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import { useFeedSummary } from "@/hooks/useFeedSummary";
import { cn } from "@/lib/utils";

/** `title: null` is for pages whose hero already carries the heading; the controls still render. */
export default function ListingFeedHeader({ title = "Explore studios" }: { title?: string | null }) {
    const { nearLabel } = useFeedSummary();
    const { location } = useBrowseLocation();

    const heading = () => {
        if (!nearLabel) return title;
        const normalized = nearLabel.toLowerCase().trim();
        if (normalized === "nearby" || normalized === "you" || normalized === "current location") {
            return "Studios nearby";
        }
        return `Studios near ${nearLabel}`;
    };

    return (
        <>
            <div className="mb-4 flex flex-col gap-4 md:mb-6 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                    {title !== null && (
                        <h1 className="truncate text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            {heading()}
                        </h1>
                    )}
                    {/* Once a location is set the phone layout shows this inside the sticky bar
                        instead, so it travels with the controls it describes. */}
                    <div className={cn(location && "hidden md:block")}>
                        <BrowseResultLine />
                    </div>
                </div>

                <div className="hidden shrink-0 flex-wrap items-center justify-end gap-2 md:flex">
                    <LocationCombobox />
                    <SortMenu />
                </div>
            </div>

            <BrowseControlBar />
            <LocationSheet />
        </>
    );
}
