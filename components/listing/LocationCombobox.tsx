"use client";

import { useEffect, useId, useRef } from "react";
import { FiCrosshair, FiMapPin, FiX } from "react-icons/fi";
import { HiLocationMarker } from "react-icons/hi";

import LocationPickerBody from "@/components/listing/LocationPickerBody";
import { useBrowseLocation } from "@/hooks/useBrowseLocation";
import { useLocationPicker } from "@/hooks/useLocationPicker";
import { cn } from "@/lib/utils";

/**
 * The desktop location control: one input that is also the pill, with the picker in a dropdown
 * that overlays the grid rather than pushing it down. The old control looked like a text field
 * but was a button, and opened a panel containing a second, real input.
 */
export default function LocationCombobox() {
    const { location, pickerOpen, openPicker, closePicker, clearLocation, detect, detectState, cancelDetect } =
        useBrowseLocation();
    const picker = useLocationPicker();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const baseId = useId();
    const listboxId = `${baseId}-areas`;
    const optionId = (index: number) => `${baseId}-area-${index}`;

    const locating = detectState === "locating";

    useEffect(() => {
        if (pickerOpen) inputRef.current?.focus();
    }, [pickerOpen]);

    useEffect(() => {
        if (!pickerOpen) return;
        const onPointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) closePicker();
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [pickerOpen, closePicker]);

    return (
        <div ref={containerRef} className="relative w-full sm:w-[360px]">
            <div
                className={cn(
                    "flex h-12 items-center gap-2 rounded-full border bg-background pl-4 pr-1.5 transition",
                    pickerOpen
                        ? "border-2 border-foreground pl-[15px] shadow-sm ring-4 ring-foreground/5"
                        : "border-border hover:shadow-sm"
                )}
            >
                {/* Solid pin once a location is set, outline while it's still a prompt. */}
                {location ? (
                    <HiLocationMarker size={17} aria-hidden="true" className="shrink-0 text-foreground" />
                ) : (
                    <FiMapPin size={16} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                )}

                <input
                    ref={inputRef}
                    role="combobox"
                    aria-expanded={pickerOpen}
                    aria-controls={listboxId}
                    aria-autocomplete="list"
                    aria-activedescendant={pickerOpen ? optionId(picker.activeIndex) : undefined}
                    aria-label="Search for an area"
                    autoComplete="off"
                    // 16px keeps iOS from zooming the page when the field takes focus.
                    className={cn(
                        "min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-foreground placeholder:text-muted-foreground focus:ring-0 sm:text-sm",
                        location && !pickerOpen && "font-semibold"
                    )}
                    placeholder={locating ? "Finding you…" : location ? location.label : "Search area, e.g. Andheri West"}
                    value={picker.query}
                    onFocus={openPicker}
                    onChange={(event) => {
                        picker.setQuery(event.target.value);
                        if (!pickerOpen) openPicker();
                    }}
                    onKeyDown={picker.onKeyDown}
                />

                {locating ? (
                    <button
                        type="button"
                        onClick={cancelDetect}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    >
                        <span
                            aria-hidden="true"
                            className="size-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground"
                        />
                        Cancel
                    </button>
                ) : location ? (
                    <>
                        <button
                            type="button"
                            onClick={clearLocation}
                            aria-label="Clear location"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        >
                            <FiX size={17} aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={detect}
                            aria-label="Use my current location"
                            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-foreground transition hover:border-foreground hover:bg-muted"
                        >
                            <FiCrosshair size={16} aria-hidden="true" />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={detect}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90"
                    >
                        <FiCrosshair size={15} aria-hidden="true" />
                        Near me
                    </button>
                )}
            </div>

            {pickerOpen && (
                // Absolute, so opening the picker never moves the grid underneath it.
                <div className="absolute left-0 top-[58px] z-50 w-[440px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-xl">
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
                    <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                        ↑ ↓ to move · Enter to pick · Esc to close
                    </p>
                </div>
            )}
        </div>
    );
}
