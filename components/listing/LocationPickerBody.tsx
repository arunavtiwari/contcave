"use client";

import { Fragment } from "react";

import {
    DetectRow,
    PickerNotice,
    type PickerRow,
    PopularAreaChips,
    RecentRow,
    rowKey,
    SectionLabel,
    SuggestionRow,
} from "@/components/listing/LocationPickerRows";
import type { DetectState } from "@/hooks/useBrowseLocation";
import { MIN_SUGGESTION_CHARS } from "@/hooks/useGooglePlaces";

type Props = {
    listboxId: string;
    optionId: (index: number) => string;
    rows: PickerRow[];
    activeIndex: number;
    setActiveIndex: (index: number) => void;
    pick: (row: PickerRow) => void;
    pickPopular: (label: string) => void;
    popularAreas: ReadonlyArray<{ label: string; secondary: string }>;
    query: string;
    typing: boolean;
    suggestionsFailed: boolean;
    detectState: DetectState;
};

const DETECT_MESSAGES: Partial<Record<DetectState, string>> = {
    denied: "Location is turned off for ContCave. Turn it on in your browser settings, or type an area below.",
    unavailable: "We couldn't get your location. Type an area instead.",
};

/**
 * The picker's list. Rendered inside the desktop dropdown and the mobile sheet alike; the
 * surrounding chrome and the input belong to those, this is only what sits under them.
 */
export default function LocationPickerBody({
    listboxId,
    optionId,
    rows,
    activeIndex,
    setActiveIndex,
    pick,
    pickPopular,
    popularAreas,
    query,
    typing,
    suggestionsFailed,
    detectState,
}: Props) {
    const detectMessage = DETECT_MESSAGES[detectState];
    const noAreasFound = typing && !suggestionsFailed && rows.length === 1;

    return (
        <>
            {detectMessage && <PickerNotice>{detectMessage}</PickerNotice>}

            <ul id={listboxId} role="listbox" aria-label="Areas">
                {rows.map((row, index) => {
                    const shared = {
                        id: optionId(index),
                        active: index === activeIndex,
                        onSelect: () => pick(row),
                        onHover: () => setActiveIndex(index),
                    };
                    if (row.kind === "detect") {
                        return <DetectRow key={rowKey(row)} {...shared} locating={detectState === "locating"} />;
                    }
                    // The section heading is a sibling list item, not a wrapper: an option
                    // nested inside another list item is not an option as far as a screen
                    // reader is concerned.
                    return (
                        <Fragment key={rowKey(row)}>
                            {index === 1 && (
                                <li role="presentation">
                                    <SectionLabel>{row.kind === "recent" ? "Recent" : "Areas"}</SectionLabel>
                                </li>
                            )}
                            {row.kind === "recent" ? (
                                <RecentRow {...shared} location={row.location} />
                            ) : (
                                <SuggestionRow {...shared} suggestion={row.suggestion} query={query} />
                            )}
                        </Fragment>
                    );
                })}
            </ul>

            {suggestionsFailed && <PickerNotice>Couldn&apos;t load suggestions. Try again.</PickerNotice>}

            {noAreasFound && (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">
                    No areas match &ldquo;{query.trim()}&rdquo;.
                </p>
            )}

            {!typing && (
                <>
                    <SectionLabel>Popular areas</SectionLabel>
                    <PopularAreaChips areas={popularAreas} onSelect={pickPopular} />
                </>
            )}

            {typing && query.trim().length < MIN_SUGGESTION_CHARS && (
                <p className="px-4 py-3 text-[13px] text-muted-foreground">Keep typing to search areas.</p>
            )}
        </>
    );
}
