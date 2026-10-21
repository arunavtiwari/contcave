"use client";

import { useState } from "react";

import Input from "@/components/ui/Input";
import { floorLabel, type ListingAccess, PARKING_LABELS, PARKING_TYPES } from "@/lib/listing/equipment";
import { cn } from "@/lib/utils";

const LIFT_OPTIONS = [
    { value: "none", label: "No lift" },
    { value: "passenger", label: "Passenger lift" },
    { value: "goods", label: "Goods lift" },
] as const;

const LOAD_IN_NOTE_MAX = 140;

function Choice({
    options,
    value,
    onChange,
    label,
}: {
    options: ReadonlyArray<{ value: string; label: string }>;
    value: string | null | undefined;
    onChange: (value: string | null) => void;
    label: string;
}) {
    return (
        <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const selected = value === option.value;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            // Tapping the selected option again clears it back to "unknown".
                            onClick={() => onChange(selected ? null : option.value)}
                            className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                                selected ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function AccessEditor({
    value,
    onChange,
}: {
    value: ListingAccess | null;
    onChange: (value: ListingAccess) => void;
}) {
    const access = value ?? {};
    const update = (patch: Partial<ListingAccess>) => onChange({ ...access, ...patch });
    const note = access.loadInNote ?? "";
    const [floorText, setFloorText] = useState(access.floor == null ? "" : String(access.floor));
    const [syncedFloor, setSyncedFloor] = useState(access.floor);
    if (access.floor !== syncedFloor) {
        setSyncedFloor(access.floor);
        if (access.floor == null ? floorText.trim() !== "" && floorText.trim() !== "-" : Number.parseInt(floorText, 10) !== access.floor) {
            setFloorText(access.floor == null ? "" : String(access.floor));
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-foreground">Which floor is the studio on?</p>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-28">
                        <Input
                            id="access-floor"
                            label="Floor"
                            placeholder="e.g. 3"
                            value={floorText}
                            onChange={(event) => {
                                const raw = event.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "").slice(0, 4);
                                setFloorText(raw);
                                if (raw === "" || raw === "-") return update({ floor: null });
                                const floor = Number.parseInt(raw, 10);
                                if (Number.isFinite(floor)) update({ floor: Math.max(-5, Math.min(200, floor)) });
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => update({ floor: 0 })}
                        className={cn(
                            "h-10 rounded-full border px-4 text-xs font-medium transition",
                            access.floor === 0 ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
                        )}
                    >
                        Ground floor
                    </button>
                    {access.floor != null && <span className="pb-2.5 text-sm text-muted-foreground">{floorLabel(access.floor)}</span>}
                </div>
                <p className="text-xs text-muted-foreground">Use -1 for a basement. Leave blank if you&apos;re not sure.</p>
            </div>

            <Choice label="Lift" options={LIFT_OPTIONS} value={access.lift} onChange={(lift) => update({ lift })} />

            <Choice
                label="Parking"
                options={PARKING_TYPES.map((type) => ({ value: type, label: PARKING_LABELS[type] }))}
                value={access.parking}
                onChange={(parking) => update({ parking })}
            />

            <Choice
                label="Can a vehicle drive up to unload gear?"
                options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]}
                value={access.vehicleLoadIn == null ? null : access.vehicleLoadIn ? "yes" : "no"}
                onChange={(choice) => update({ vehicleLoadIn: choice == null ? null : choice === "yes" })}
            />

            <div className="flex flex-col gap-1.5">
                <Input
                    id="access-load-in-note"
                    label="Load-in note"
                    placeholder="e.g. Lights and stands fit in the passenger lift"
                    maxLength={LOAD_IN_NOTE_MAX}
                    value={note}
                    onChange={(event) => update({ loadInNote: event.target.value.slice(0, LOAD_IN_NOTE_MAX) })}
                />
                <p className="text-right text-xs text-muted-foreground">{note.length}/{LOAD_IN_NOTE_MAX}</p>
            </div>
        </div>
    );
}
