"use client";

import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import { useFeedSummary } from "@/hooks/useFeedSummary";
import { BROWSE_SORT_LABELS } from "@/lib/listing/browseSort";

/**
 * "24 studios · nearest to Noida first" - what the list is showing and why it is in this order,
 * said once rather than left for the reader to infer from the cards moving around.
 */
export default function BrowseResultLine() {
    const { total } = useFeedSummary();
    const { location, sort } = useBrowseLocation();

    const count = total === null ? null : `${total} ${total === 1 ? "studio" : "studios"}`;

    const reason =
        sort === "distance" && location
            ? `nearest to ${location.label} first`
            : sort !== "recommended"
                ? BROWSE_SORT_LABELS[sort].toLowerCase()
                : !location
                    ? "set a location to see the closest first"
                    : null;

    return (
        <p aria-live="polite" className="mt-1 min-h-5 text-sm text-muted-foreground">
            {count && (
                <>
                    {count}
                    {reason && (
                        <>
                            {" · "}
                            {/* The reason is emphasised only when it states the order in force;
                                the nudge to set a location is an aside, not the headline. */}
                            {location ? (
                                <span className="font-semibold text-foreground">{reason}</span>
                            ) : (
                                reason
                            )}
                        </>
                    )}
                </>
            )}
        </p>
    );
}
