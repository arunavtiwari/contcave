import React, { useCallback, useMemo } from "react";

import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import FormField from "@/components/inputs/FormField";
import Input from "@/components/inputs/Input";
import Switch from "@/components/inputs/Switch";
import Pill from "@/components/ui/Pill";
import Select, { SelectOption } from "@/components/ui/Select";
import { spaceTypes } from "@/constants/spaceTypes";
import { TIME_SLOTS } from "@/constants/timeSlots";

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

const OtherListingDetails: React.FC<Props> = ({ onChange, data }) => {
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

    const handleTypeSelect = (t: string) => {
        const exists = details.type.includes(t);
        const newType = exists ? details.type.filter((x) => x !== t) : [...details.type, t];
        onChange({ ...details, type: newType });
    };

    return (<div className="flex flex-col gap-8">
        {/* Carpet Area */}
        <Input
            id="carpetArea"
            label="Carpet Area"
            description="Total floor area of the space"
            variant="horizontal"
            type="number"
            placeholder="e.g. 2500"
            value={details.carpetArea || ""}
            onNumberChange={(val) => handleInputChange("carpetArea", val)}
            customRightContent={<span className="text-muted-foreground text-sm font-medium">sq ft</span>}
            required
        />

        <hr className="border-border" />

        <Select
            label="Operational Days"
            description="Days when the space is open"
            variant="horizontal"
            required
            className="w-full"
            options={dayOptions}
            value={dayOptions.find((d) => d.value === details.operationalDays.start)}
            onChange={(newValue) => {
                const sel = newValue as SelectOption | null;
                handleInputChange("operationalDays", {
                    ...details.operationalDays,
                    start: sel?.value || "",
                });
            }}
            placeholder="Start Day"
        />

        <Select
            className="w-full"
            options={dayOptions}
            value={dayOptions.find((d) => d.value === details.operationalDays.end)}
            onChange={(newValue) => {
                const sel = newValue as SelectOption | null;
                handleInputChange("operationalDays", {
                    ...details.operationalDays,
                    end: sel?.value || "",
                });
            }}
            placeholder="End Day"
        />

                <Switch
                    label="Open all day"
                    description="Enable if your space is open 24 hours"
                    variant="horizontal"
                    checked={isOpenAllDay}
                    onChange={handleOpenAllDayToggle}
                />
                <div className="flex gap-4">
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
                        placeholder="Start Time"
                        isDisabled={isOpenAllDay}
                    />
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
                        placeholder="End Time"
                        isDisabled={isOpenAllDay}
                    />
                </div>

        <hr className="border-border" />

        {/* Minimum Booking & Max Pax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
                id="minimumBookingHours"
                label="Min. Booking Hours"
                variant="horizontal"
                type="number"
                placeholder="e.g. 2"
                value={details.minimumBookingHours || ""}
                onNumberChange={(val) => handleInputChange("minimumBookingHours", val)}
                customRightContent={<span className="text-muted-foreground text-sm font-medium">hrs</span>}
                required
            />

            <Input
                id="maximumPax"
                label="Maximum Capacity"
                variant="horizontal"
                type="number"
                placeholder="e.g. 10"
                value={details.maximumPax || ""}
                onNumberChange={(val) => handleInputChange("maximumPax", val)}
                customRightContent={<span className="text-muted-foreground text-sm font-medium">pax</span>}
                required
            />
        </div>

        <hr className="border-border" />

        <AmenitiesCheckbox
            label="Space Type"
            description="Select all that apply"
            variant="horizontal"
            required
            amenities={spaceTypes.map(t => ({ id: t, name: t, category: "" })) as any}
            checked={details.type || []}
            onChange={(updated: { predefined: { [key: string]: boolean }; custom: string[] }) => handleInputChange("type", Object.keys(updated.predefined).filter(k => updated.predefined[k]))}
        />

        <hr className="border-border" />

        {/* Toggles */}
        <div className="space-y-6">
            <Switch
                label="Instant Booking"
                description="Allow customers to book without waiting for approval"
                variant="horizontal"
                checked={details.instantBooking}
                onChange={(checked) => handleInputChange("instantBooking", !!checked)}
                styleVariant="bolt"
            />

            <Switch
                label="Multiple Sets"
                description="Does this space have multiple sub-units?"
                variant="horizontal"
                checked={details.hasSets}
                onChange={(checked) => handleInputChange("hasSets", !!checked)}
            />
        </div>
    </div >
    );
};

export default OtherListingDetails;


