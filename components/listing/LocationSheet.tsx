"use client";

import { useEffect, useId, useRef } from "react";
import { FiSearch, FiX } from "react-icons/fi";

import LocationPickerBody from "@/components/listing/LocationPickerBody";
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
    const sheetRef = useRef<HTMLDivElement | null>(null);
    const dragStart = useRef<number | null>(null);

    const baseId = useId();
    const listboxId = `${baseId}-areas`;
    const optionId = (index: number) => `${baseId}-area-${index}`;

    const showing = pickerOpen && !isDesktop;

    // The sheet covers the page, so the page behind it must not scroll underneath.
    useEffect(() => {
        if (!showing) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        inputRef.current?.focus();
        return () => {
            document.body.style.overflow = previous;
        };
    }, [showing]);

    // Focus stays inside while the sheet is modal, and goes back to the trigger on close.
    useEffect(() => {
        if (!showing) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Tab") return;
            const focusable = sheetRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [showing]);

    if (!showing) return null;

    return (
        <div className="fixed inset-0 z-50 md:hidden">
            <button
                type="button"
                aria-label="Close location picker"
                onClick={closePicker}
                className="absolute inset-0 w-full bg-foreground/40"
            />

            <div
                ref={sheetRef}
                role="dialog"
                aria-modal="true"
                aria-label="Where's your shoot?"
                className="absolute inset-x-0 bottom-0 top-16 flex flex-col overflow-hidden rounded-t-[22px] bg-background shadow-2xl"
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
                        <h2 className="text-base font-bold text-foreground">Where&apos;s your shoot?</h2>
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
            </div>
        </div>
    );
}
