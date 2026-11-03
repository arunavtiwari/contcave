"use client";

import { FiClock, FiMapPin, FiNavigation } from "react-icons/fi";

import type { AreaSuggestion } from "@/hooks/useGooglePlaces";
import type { BrowseLocation } from "@/lib/listing/browseLocation";
import { cn } from "@/lib/utils";

/**
 * The contents of the location picker, shared by the desktop dropdown and the mobile sheet so
 * the two can never drift apart. Keyboard state is owned by the caller: these rows only render.
 */

/** Rows the arrow keys move through. Popular areas are chips and are reached with Tab instead. */
export type PickerRow =
    | { kind: "detect" }
    | { kind: "recent"; location: BrowseLocation }
    | { kind: "suggestion"; suggestion: AreaSuggestion };

export const rowKey = (row: PickerRow) =>
    row.kind === "detect"
        ? "detect"
        : row.kind === "recent"
            ? `recent:${row.location.label}`
            : `suggestion:${row.suggestion.placeId}`;

export function SectionLabel({ children }: { children: string }) {
    return (
        <p className="px-4 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
        </p>
    );
}

/** Bolds the part of an area name the visitor has typed so far. */
export function MatchedText({ text, query }: { text: string; query: string }) {
    const needle = query.trim().toLowerCase();
    const index = needle ? text.toLowerCase().indexOf(needle) : -1;
    if (index < 0) return <>{text}</>;
    return (
        <>
            {text.slice(0, index)}
            <strong className="font-bold">{text.slice(index, index + needle.length)}</strong>
            {text.slice(index + needle.length)}
        </>
    );
}

type RowProps = {
    id: string;
    active: boolean;
    onSelect: () => void;
    onHover: () => void;
};

/** Rows live inside a listbox, so they are options and the input keeps the focus. */
function OptionRow({
    id,
    active,
    onSelect,
    onHover,
    icon,
    title,
    subtitle,
}: RowProps & { icon: React.ReactNode; title: React.ReactNode; subtitle?: string }) {
    return (
        <li
            id={id}
            role="option"
            aria-selected={active}
            onMouseDown={(event) => {
                // Keeps the input focused, so the dropdown doesn't close before the click lands.
                event.preventDefault();
                onSelect();
            }}
            onMouseEnter={onHover}
            className={cn(
                "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors",
                active && "bg-muted"
            )}
        >
            {icon}
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground">{title}</span>
                {subtitle && <span className="block truncate text-[13px] text-muted-foreground">{subtitle}</span>}
            </span>
        </li>
    );
}

export function DetectRow({ id, active, onSelect, onHover, locating }: RowProps & { locating: boolean }) {
    return (
        <OptionRow
            id={id}
            active={active}
            onSelect={onSelect}
            onHover={onHover}
            icon={
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <FiNavigation size={16} aria-hidden="true" />
                </span>
            }
            title={
                <span className="font-semibold">{locating ? "Finding you…" : "Use my current location"}</span>
            }
            subtitle="Show the studios closest to you first"
        />
    );
}

export function RecentRow({ id, active, onSelect, onHover, location }: RowProps & { location: BrowseLocation }) {
    return (
        <OptionRow
            id={id}
            active={active}
            onSelect={onSelect}
            onHover={onHover}
            icon={<FiClock size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
            title={location.label}
        />
    );
}

export function SuggestionRow({
    id,
    active,
    onSelect,
    onHover,
    suggestion,
    query,
}: RowProps & { suggestion: AreaSuggestion; query: string }) {
    return (
        <OptionRow
            id={id}
            active={active}
            onSelect={onSelect}
            onHover={onHover}
            icon={<FiMapPin size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
            title={<MatchedText text={suggestion.main} query={query} />}
            subtitle={suggestion.secondary}
        />
    );
}

export function PopularAreaChips({
    areas,
    onSelect,
}: {
    areas: ReadonlyArray<{ label: string; secondary: string }>;
    onSelect: (label: string) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2 px-4 pt-1 pb-4">
            {areas.map((area) => (
                <button
                    key={area.label}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(area.label)}
                    title={area.secondary}
                    className="min-h-11 rounded-full border border-border px-3.5 text-sm font-medium text-foreground transition hover:border-foreground hover:bg-muted sm:min-h-9"
                >
                    {area.label}
                </button>
            ))}
        </div>
    );
}

/** GPS refused or unreachable, and autocomplete failures: said in place, never in an alert. */
export function PickerNotice({ children }: { children: React.ReactNode }) {
    return (
        <p className="mx-4 my-3 rounded-xl bg-warning/10 px-3 py-2.5 text-[13px] leading-snug text-foreground">
            {children}
        </p>
    );
}
