import React, { useCallback, useMemo } from "react";

import AmenitiesCheckbox from "@/components/inputs/AmenitySelection";
import FormField from "@/components/inputs/FormField";
import Input from "@/components/inputs/Input";
import Switch from "@/components/inputs/Switch";
import Select, { SelectOption } from "@/components/ui/Select";
import { spaceTypes } from "@/constants/spaceTypes";
import { TIME_SLOTS } from "@/constants/timeSlots";
import { cn } from "@/lib/utils";

export type ListingDetails = {
    carpetArea: number;
    operationalDays: { start?: string; end?: string };
    operationalHours: { start?: string; end?: string };
    minimumBookingHours: number;
    maximumPax: number;
    instantBooking: boolean;
    type: string[];
    hasSets: boolean;
};

type Props = {
    onChange: (details: ListingDetails) => void;
    data?: ListingDetails;
    optional?: boolean;
};

const dayOptions: SelectOption[] = [
    { value: "Mon", label: "Monday" },
    { value: "Tue", label: "Tuesday" },
    { value: "Wed", label: "Wednesday" },
    { value: "Thu", label: "Thursday" },
    { value: "Fri", label: "Friday" },
    { value: "Sat", label: "Saturday" },
    { value: "Sun", label: "Sunday" },
];

const staticTimeOptions: SelectOption[] = TIME_SLOTS.map((t) => ({
    value: t,
    label: t,
}));

const OtherListingDetails: React.FC<Props> = ({ onChange, data, optional = false }) => {
    // Default values if data is undefined
    const details = useMemo(() => data || {
        carpetArea: 0,
        operationalDays: { start: "Mon", end: "Sun" },
        operationalHours: { start: "9:00 AM", end: "9:00 PM" },
        minimumBookingHours: 0,
        maximumPax: 0,
        instantBooking: false,
        type: [],
        hasSets: false,
    }, [data]);

    const startTime = details.operationalHours.start || "";
    const startIdx = useMemo(() => staticTimeOptions.findIndex((t) => t.value === startTime), [startTime]);

    const startTimeOptions = useMemo(() => staticTimeOptions.slice(0, -1), []);

    const endTimeOptions = useMemo(() => {
        if (startIdx === -1) return staticTimeOptions.slice(1);
        return staticTimeOptions.slice(startIdx + 1);
    }, [startIdx]);

    const isOpenAllDay = useMemo(() => {
        return (
            details.operationalHours.start === "12:00 AM" &&
            details.operationalHours.end === "12:00 AM"
        );
    }, [details]);

    const handleOpenAllDayToggle = useCallback((checked: boolean) => {
        if (checked) {
            onChange({
                ...details,
                operationalHours: { start: "12:00 AM", end: "12:00 AM" },
            });
        } else {
            // Reset to default hours
            onChange({
                ...details,
                operationalHours: { start: "9:00 AM", end: "9:00 PM" },
            });
        }
    }, [details, onChange]);

    const handleInputChange = useCallback((field: keyof ListingDetails, value: string | number | boolean | string[] | { start?: string; end?: string }) => {
        onChange({ ...details, [field]: value });
    }, [details, onChange]);


    return (<div className="flex flex-col gap-8">
        {/* Row 1: Metrics (Carpet & Pax) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
                id="carpetArea"
                label="Carpet Area"
                variant="vertical"
                type="number"
                placeholder="e.g. 2500"
                value={details.carpetArea || ""}
                onNumberChange={(val) => handleInputChange("carpetArea", val)}
                customRightContent={<span className="text-muted-foreground text-xs font-medium">sq ft</span>}
                required={!optional}
            />

            <Input
                id="maximumPax"
                label="Max Pax"
                variant="vertical"
                type="number"
                placeholder="e.g. 10"
                value={details.maximumPax || ""}
                onNumberChange={(val) => handleInputChange("maximumPax", val)}
                customRightContent={<span className="text-muted-foreground text-xs font-medium">pax</span>}
                required={!optional}
            />
        </div>

        {/* Row 2: Min Booking & Days */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
                id="minimumBookingHours"
                label="Min. Booking Hours"
                variant="vertical"
                type="number"
                placeholder="e.g. 2"
                value={details.minimumBookingHours || ""}
                onNumberChange={(val) => handleInputChange("minimumBookingHours", val)}
                customRightContent={<span className="text-muted-foreground text-xs font-medium">hrs</span>}
                required={!optional}
            />

            <FormField label="Operational Days" required={!optional} variant="vertical">
                <div className="flex gap-3 w-full">
                    <Select
                        className="flex-1"
                        options={dayOptions}
                        value={dayOptions.find((d) => d.value === details.operationalDays.start)}
                        onChange={(newValue) => {
                            const sel = newValue as SelectOption | null;
                            handleInputChange("operationalDays", {
                                ...details.operationalDays,
                                start: sel?.value || "",
                            });
                        }}
                        placeholder="Start"
                    />
                    <Select
                        className="flex-1"
                        options={dayOptions}
                        value={dayOptions.find((d) => d.value === details.operationalDays.end)}
                        onChange={(newValue) => {
                            const sel = newValue as SelectOption | null;
                            handleInputChange("operationalDays", {
                                ...details.operationalDays,
                                end: sel?.value || "",
                            });
                        }}
                        placeholder="End"
                    />
                </div>
            </FormField>
        </div>

        {/* Row 3: Operational Hours (Full Width) */}
        <div className="w-full">
            <FormField label="Operational Hours" required={!optional} variant="horizontal" align="start">
                <div className="flex flex-col gap-4 w-full">
                    <Switch
                        size="sm"
                        checked={isOpenAllDay}
                        onChange={handleOpenAllDayToggle}
                        label="Open 24 Hours"
                        variant="horizontal"
                        labelWidth="flex-1"
                        childWidth="auto"
                    />

                    <div className={cn(
                        "flex items-center gap-2 w-full transition-opacity duration-300",
                        isOpenAllDay ? "opacity-40 pointer-events-none" : "opacity-100"
                    )}>
                        <Select
                            className="flex-1"
                            options={startTimeOptions}
                            value={startTimeOptions.find((t) => t.value === (details.operationalHours.start || "")) || null}
                            onChange={(newValue) => {
                                const sel = newValue as SelectOption | null;
                                const nextStart = sel?.value || "";
                                const nextStartIdx = staticTimeOptions.findIndex((t) => t.value === nextStart);
                                const currentEnd = details.operationalHours.end || "";
                                const currentEndIdx = staticTimeOptions.findLastIndex((t) => t.value === currentEnd);
                                const nextEnd =
                                    nextStartIdx !== -1 && (currentEndIdx === -1 || currentEndIdx <= nextStartIdx)
                                        ? staticTimeOptions[nextStartIdx + 1]?.value || currentEnd
                                        : currentEnd;

                                handleInputChange("operationalHours", {
                                    ...details.operationalHours,
                                    start: nextStart,
                                    end: nextEnd,
                                });
                            }}
                            placeholder="Start"
                            isDisabled={isOpenAllDay}
                        />
                        <span className="text-muted-foreground text-sm font-medium px-1">to</span>
                        <Select
                            className="flex-1"
                            options={endTimeOptions}
                            value={endTimeOptions.find((t) => {
                                if (isOpenAllDay && t.value === "12:00 AM") return true;
                                return t.value === (details.operationalHours.end || "");
                            }) || null}
                            onChange={(newValue) => {
                                const sel = newValue as SelectOption | null;
                                handleInputChange("operationalHours", {
                                    ...details.operationalHours,
                                    end: sel?.value || "",
                                });
                            }}
                            placeholder="End"
                            isDisabled={isOpenAllDay}
                        />
                    </div>
                </div>
            </FormField>
        </div>

        <AmenitiesCheckbox
            label="Space Type"
            variant="vertical"
            required
            disableCustom
            amenities={spaceTypes.map(t => ({ id: t, name: t, createdAt: new Date(), icon: null }))}
            checked={details.type || []}
            onChange={(updated: { predefined: { [key: string]: boolean }; custom: string[] }) => handleInputChange("type", Object.keys(updated.predefined).filter(k => updated.predefined[k]))}
        />

        {/* Toggles Card Grid */}
        {!optional && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-border rounded-xl p-4 bg-neutral-50/50">
                <Switch
                    label="Instant Booking"
                    description="Allow customers to book without waiting for approval"
                    variant="horizontal"
                    checked={details.instantBooking}
                    onChange={(checked) => handleInputChange("instantBooking", !!checked)}
                    styleVariant="bolt"
                    size="sm"
                    labelWidth="flex-1 text-foreground"
                    childWidth="auto"
                />
            </div>

            <div className="border border-border rounded-xl p-4 bg-neutral-50/50">
                <Switch
                    label="Multiple Sets"
                    description="Does this space have multiple sub-units?"
                    variant="horizontal"
                    checked={details.hasSets}
                    onChange={(checked) => handleInputChange("hasSets", !!checked)}
                    size="sm"
                    labelWidth="flex-1 text-foreground"
                    childWidth="auto"
                />
            </div>
        </div>
        )}
    </div >
    );
};

export default OtherListingDetails;


