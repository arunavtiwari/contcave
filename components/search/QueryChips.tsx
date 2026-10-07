"use client";

import { format } from "date-fns";
import { useState } from "react";

import Calendar from "@/components/inputs/Calendar";
import ChoicePills from "@/components/inputs/ChoicePills";
import TaxonomyPillSelect from "@/components/inputs/TaxonomyPillSelect";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Pill from "@/components/ui/Pill";
import { addDaysToDateKey, BOOKING_HORIZON_DAYS, istDateKey } from "@/lib/booking/dayAvailability";
import { queryChips } from "@/lib/search/explain";
import { AESTHETICS, FACILITY_AMENITIES, SET_FEATURES, type TaxonomyItem, USE_CASES, VENUE_TYPES } from "@/lib/taxonomy";
import {
    OVERRIDE_FIELD_MAP,
    overridesToParams,
    type ParsedQuery,
    type QueryField,
    type QueryOverrides,
    TAG_FIELDS,
} from "@/schemas/search";

type TagField = (typeof TAG_FIELDS)[number];

const ADDABLE: QueryField[] = ["dates", "hours", "crew", "budget"];

const BUDGET_BASES = [
    { value: "total", label: "Total incl. GST" },
    { value: "hourly", label: "Per hour" },
] as const;

const VOCABULARY: Record<TagField, TaxonomyItem[]> = {
    shootTypes: USE_CASES,
    needs: [...SET_FEATURES, ...FACILITY_AMENITIES],
    vibes: AESTHETICS,
    venueTypes: VENUE_TYPES,
};

const isTagField = (field: QueryField): field is TagField => (TAG_FIELDS as readonly string[]).includes(field);

const overrideKeysOf = (field: QueryField) =>
    (Object.keys(OVERRIDE_FIELD_MAP) as (keyof QueryOverrides)[]).filter((key) => OVERRIDE_FIELD_MAP[key] === field);

const valuesOf = (parsed: ParsedQuery, field: QueryField): QueryOverrides =>
    Object.fromEntries(overrideKeysOf(field).map((key) => [key, parsed[key]]));

const clearedOf = (field: QueryField): QueryOverrides =>
    Object.fromEntries(overrideKeysOf(field).map((key) => [key, key === "budgetBasis" ? "total" : isTagField(field) || key === "dates" ? [] : null]));

const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");
const fromDateKey = (key?: string) => (key ? new Date(`${key}T00:00:00`) : null);
const toNumber = (value: string) => (value.trim() === "" ? null : Number(value));

type QueryChipsProps = { parsed: ParsedQuery; cityOptions: string[]; onApply: (params: Record<string, string>) => void };

export default function QueryChips({ parsed, cityOptions, onApply }: QueryChipsProps) {
    const [editing, setEditing] = useState<QueryField | null>(null);
    const [draft, setDraft] = useState<QueryOverrides>({});

    const chips = queryChips(parsed).filter((chip) => chip.value || ADDABLE.includes(chip.field));
    const today = istDateKey(new Date());

    const open = (field: QueryField) => {
        setDraft(valuesOf(parsed, field));
        setEditing(editing === field ? null : field);
    };
    const apply = (overrides: QueryOverrides) => {
        setEditing(null);
        onApply(overridesToParams(overrides));
    };
    const update = (patch: QueryOverrides) => setDraft((current) => ({ ...current, ...patch }));

    const editor = (field: QueryField) => {
        if (isTagField(field)) {
            return (
                <TaxonomyPillSelect
                    label={chips.find((chip) => chip.field === field)?.label ?? ""}
                    vocab={VOCABULARY[field]}
                    value={(draft[field] as string[] | undefined) ?? []}
                    onChange={(next) => update({ [field]: next })}
                />
            );
        }
        switch (field) {
            case "city": {
                const cities = Array.from(new Set([...(parsed.city ? [parsed.city] : []), ...cityOptions]));
                return <ChoicePills label="City" options={cities.map((city) => ({ value: city, label: city }))} value={draft.city ?? null} onChange={(city) => update({ city })} />;
            }
            case "area":
                return <Input id="search-area" placeholder="e.g. Gomti Nagar" value={draft.area ?? ""} onChange={(event) => update({ area: event.target.value || null })} />;
            case "dates":
                return (
                    <Calendar
                        value={fromDateKey(draft.dates?.[0])}
                        minDate={fromDateKey(today) ?? undefined}
                        maxDate={fromDateKey(addDaysToDateKey(today, BOOKING_HORIZON_DAYS)) ?? undefined}
                        onChange={(date) => update({ dates: date ? [toDateKey(date)] : [] })}
                    />
                );
            case "startTime":
                return <Input id="search-start" type="time" value={draft.startTime ?? ""} onChange={(event) => update({ startTime: event.target.value || null })} />;
            case "hours":
                return <Input id="search-hours" type="number" min={1} max={24} value={draft.hours ?? ""} onChange={(event) => update({ hours: toNumber(event.target.value) })} />;
            case "crew":
                return <Input id="search-crew" type="number" min={1} max={500} value={draft.crew ?? ""} onChange={(event) => update({ crew: toNumber(event.target.value) })} />;
            case "budget":
                return (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <Input id="search-budget-min" type="number" min={0} placeholder="Min ₹" value={draft.budgetMin ?? ""} onChange={(event) => update({ budgetMin: toNumber(event.target.value) })} />
                            <Input id="search-budget-max" type="number" min={0} placeholder="Max ₹" value={draft.budgetMax ?? ""} onChange={(event) => update({ budgetMax: toNumber(event.target.value) })} />
                        </div>
                        <ChoicePills label="Budget basis" options={BUDGET_BASES} value={draft.budgetBasis ?? "total"} onChange={(budgetBasis) => update({ budgetBasis })} />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                    <button key={chip.field} type="button" onClick={() => open(chip.field)} aria-expanded={editing === chip.field} className="rounded-full">
                        <Pill
                            size="sm"
                            variant={!chip.value ? "outline" : editing === chip.field ? "solid" : chip.inferred ? "neutral" : "secondary"}
                            className={chip.inferred && chip.value ? "border-dashed border-neutral-300 tracking-normal" : "tracking-normal"}
                            label={chip.value ? `${chip.label}: ${chip.value}${chip.inferred ? " ?" : ""}` : `+ ${chip.label}`}
                        />
                    </button>
                ))}
            </div>
            {editing && (
                <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                    {editor(editing)}
                    <div className="flex flex-wrap gap-2">
                        <Button label="Apply" size="sm" rounded fit onClick={() => apply(draft)} />
                        <Button label="Clear" size="sm" variant="ghost" rounded fit onClick={() => apply(clearedOf(editing))} />
                        <Button label="Cancel" size="sm" variant="ghost" rounded fit onClick={() => setEditing(null)} />
                    </div>
                </div>
            )}
        </div>
    );
}
