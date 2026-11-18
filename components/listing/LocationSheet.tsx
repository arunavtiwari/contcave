"use client";

import { useId, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";

import LocationPickerBody from "@/components/listing/LocationPickerBody";
import Sheet, { SheetTitle } from "@/components/ui/Sheet";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import { useLocationPicker } from "@/hooks/useLocationPicker";
import { MD_BREAKPOINT, useMediaQuery } from "@/hooks/useMediaQuery";

/** Dragging the sheet down this far closes it. */
const SWIPE_CLOSE_PX = 80;

/**
 * The phone location picker. A dropdown anchored to a control is unusable at this width once
 * the keyboard is up, so the picker takes over the screen from just below the status bar and
 * keeps the input pinned above the keyboard.
 */
export default function LocationSheet() {
    const { pickerOpen, closePicker, detectState } = useBrowseLocation();
    const picker = useLocationPicker();
    // Above md the dropdown beside the heading is the picker; only one of the two is ever mounted.
    const isDesktop = useMediaQuery(MD_BREAKPOINT);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const dragStart = useRef<number | null>(null);

    const baseId = useId();
    const listboxId = `${baseId}-areas`;
    const optionId = (index: number) => `${baseId}-area-${index}`;

    return (
        <Sheet
            open={pickerOpen && !isDesktop}
            onOpenChange={(open) => !open && closePicker()}
            onOpenAutoFocus={(event) => {
                event.preventDefault();
                inputRef.current?.focus();
            }}
            className="md:hidden"
            onTouchStart={(event) => {
                dragStart.current = event.touches[0]?.clientY ?? null;
            }}
            onTouchEnd={(event) => {
                const start = dragStart.current;
                const end = event.changedTouches[0]?.clientY;
                dragStart.current = null;
                if (start !== null && end !== undefined && end - start > SWIPE_CLOSE_PX) closePicker();
            }}
        >
                <div className="shrink-0 px-4 pt-2.5">
                    <div aria-hidden="true" className="mx-auto h-1 w-10 rounded-full bg-border" />

                    <div className="flex items-center justify-between gap-2 pt-2 pb-3">
                        <SheetTitle className="text-base font-bold text-foreground">Where&apos;s your shoot?</SheetTitle>
                        <button
                            type="button"
                            onClick={closePicker}
                            aria-label="Close"
                            className="-mr-2 flex size-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <FiX size={20} aria-hidden="true" />
                        </button>
                    </div>

                    <div className="mb-3 flex h-12 items-center gap-2 rounded-2xl border-2 border-foreground px-3.5">
                        <FiSearch size={17} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                        <input
                            ref={inputRef}
                            role="combobox"
                            aria-expanded
                            aria-controls={listboxId}
                            aria-autocomplete="list"
                            aria-activedescendant={optionId(picker.activeIndex)}
                            aria-label="Search for an area"
                            autoComplete="off"
                            // 16px, so iOS doesn't zoom the page when the field takes focus.
                            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-foreground placeholder:text-muted-foreground focus:ring-0"
                            placeholder="Search area, e.g. Andheri West"
                            value={picker.query}
                            onChange={(event) => picker.setQuery(event.target.value)}
                            onKeyDown={picker.onKeyDown}
                        />
                        {picker.query && (
                            <button
                                type="button"
                                onClick={() => picker.setQuery("")}
                                aria-label="Clear search"
                                className="-mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted"
                            >
                                <FiX size={16} aria-hidden="true" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Only the list scrolls, so the input stays above the keyboard. */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6">
                    <LocationPickerBody
                        listboxId={listboxId}
                        optionId={optionId}
                        rows={picker.rows}
                        activeIndex={picker.activeIndex}
                        setActiveIndex={picker.setActiveIndex}
                        pick={(row) => void picker.pick(row)}
                        pickPopular={picker.pickPopular}
                        popularAreas={picker.popularAreas}
                        query={picker.query}
                        typing={picker.typing}
                        suggestionsFailed={picker.suggestionsFailed}
                        detectState={detectState}
                    />
                </div>
        </Sheet>
    );
}
