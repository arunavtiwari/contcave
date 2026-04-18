import React, { useCallback, useMemo } from "react";
import Select, { GroupBase, StylesConfig } from "react-select";

import Switch from "@/components/ui/Switch";
import { spaceTypes } from "@/constants/spaceTypes";

import FormField from "../ui/FormField";
import Input from "../ui/Input";

export type ListingDetails = {
    carpetArea: string;
    operationalDays: { start?: string; end?: string };
    operationalHours: { start?: string; end?: string };
    minimumBookingHours: string;
    maximumPax: string;
    instantBooking: boolean;
    type: string[];
    hasSets: boolean;
};

type Props = {
    onChange: (details: ListingDetails) => void;
    data?: ListingDetails;
};

// Define OptionType for react-select
interface OptionType {
    value: string;
    label: string;
}

const dayOptions: OptionType[] = [
    { value: "Mon", label: "Monday" },
    { value: "Tue", label: "Tuesday" },
    { value: "Wed", label: "Wednesday" },
    { value: "Thu", label: "Thursday" },
    { value: "Fri", label: "Friday" },
    { value: "Sat", label: "Saturday" },
    { value: "Sun", label: "Sunday" },
];

import { TIME_SLOTS } from "@/constants/timeSlots";

const staticTimeOptions: OptionType[] = TIME_SLOTS.map((t) => ({
    value: t,
    label: t,
}));

const customStyles: StylesConfig<OptionType, false, GroupBase<OptionType>> = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: "white",
        borderWidth: "1px",
        borderColor: state.isFocused ? "black" : "#e5e5e5",
        borderRadius: "0.5rem",
        padding: "0 4px",
        boxShadow: state.isFocused ? "0 0 0 1px black" : "none",
        minHeight: "42px",
        height: "42px",
        fontSize: "0.875rem",
        transition: "all 0.2s ease",
        "&:hover": {
            borderColor: state.isFocused ? "black" : "#a3a3a3",
        },
    }),
    input: (provided) => ({
        ...provided,
        fontSize: "0.875rem",
        margin: 0,
        padding: 0,
        color: "#171717",
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: "0 8px",
    }),
    singleValue: (provided) => ({
        ...provided,
        margin: 0,
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#171717",
    }),
    placeholder: (provided) => ({
        ...provided,
        fontSize: "0.875rem",
        color: "#737373",
    }),
    option: (provided, state) => ({
        ...provided,
        cursor: "pointer",
        fontSize: "0.875rem",
        padding: "10px 12px",
        backgroundColor: state.isSelected ? "black" : state.isFocused ? "#f5f5f5" : "white",
        color: state.isSelected ? "white" : "#171717",
        ":active": {
            backgroundColor: state.isSelected ? "black" : "#e5e5e5",
        },
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: "0.5rem",
        overflow: "hidden",
        marginTop: "4px",
        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        border: "1px solid #e5e5e5",
        zIndex: 999999,
        width: "100%", // Explicitly wide but constrained
        minWidth: "max-content", // Allow it to NOT shrink below content
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999999 }),
};

const OtherListingDetails: React.FC<Props> = ({ onChange, data }) => {
    // Default values if data is undefined
    const details = useMemo(() => data || {
        carpetArea: "",
        operationalDays: { start: "Mon", end: "Sun" },
        operationalHours: { start: "9:00 AM", end: "9:00 PM" },
        minimumBookingHours: "",
        maximumPax: "",
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

    const handleInputChange = useCallback((field: keyof ListingDetails, value: string | boolean | string[] | { start?: string; end?: string }) => {
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
            type="text"
            placeholder="e.g. 2500"
            value={details.carpetArea}
            onChange={(e) => handleInputChange("carpetArea", e.target.value)}
            customRightContent={<span className="text-muted-foreground text-sm font-medium">sq ft</span>}
            required
        />

        <hr className="border-neutral-200" />

        {/* Operational Days */}
        <FormField
            label="Operational Days"
            description="Days when the space is open"
            variant="horizontal"
            required
        >
            <div className="flex gap-4 w-full">
                <Select
                    options={dayOptions}
                    value={dayOptions.find((d) => d.value === details.operationalDays.start)}
                    onChange={(sel) =>
                        handleInputChange("operationalDays", {
                            ...details.operationalDays,
                            start: sel?.value || "",
                        })
                    }
                    placeholder="Start Day"
                    styles={customStyles}
                    isSearchable={false}
                    className="flex-1"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    maxMenuHeight={250}
                    menuShouldScrollIntoView={false}
                />
                <Select
                    options={dayOptions}
                    value={dayOptions.find((d) => d.value === details.operationalDays.end)}
                    onChange={(sel) =>
                        handleInputChange("operationalDays", {
                            ...details.operationalDays,
                            end: sel?.value || "",
                        })
                    }
                    placeholder="End Day"
                    styles={customStyles}
                    isSearchable={false}
                    className="flex-1"
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                    menuPosition="fixed"
                    menuPlacement="auto"
                    maxMenuHeight={250}
                    menuShouldScrollIntoView={false}
                />
            </div>
        </FormField>

        {/* Operational Hours */}
        <FormField
            label="Opening Hours"
            description="Daily operating hours"
            variant="horizontal"
            required
        >
            <div className="flex flex-col gap-4 w-full">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">Open all day</span>
                        <span className="text-xs text-muted-foreground">Enable if your space is open 24 hours</span>
                    </div>
                    <Switch
                        checked={isOpenAllDay}
                        onChange={handleOpenAllDayToggle}
                    />
                </div>
                <div className="flex gap-4">
                    <Select
                        options={startTimeOptions}
                        value={startTimeOptions.find((t) => t.value === (details.operationalHours.start || "")) || null}
                        onChange={(sel) => {
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
                        styles={customStyles}
                        isDisabled={isOpenAllDay}
                        className="flex-1"
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        isSearchable={false}
                        menuPosition="fixed"
                        menuPlacement="auto"
                        maxMenuHeight={250}
                        menuShouldScrollIntoView={false}
                    />
                    <Select
                        options={endTimeOptions}
                        value={endTimeOptions.find((t) => {
                            if (isOpenAllDay && t.value === "12:00 AM") return true;
                            return t.value === (details.operationalHours.end || "");
                        }) || null}
                        onChange={(sel) =>
                            handleInputChange("operationalHours", {
                                ...details.operationalHours,
                                end: sel?.value || "",
                            })
                        }
                        placeholder="End Time"
                        styles={customStyles}
                        isDisabled={isOpenAllDay}
                        className="flex-1"
                        menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                        isSearchable={false}
                        menuPosition="fixed"
                        menuPlacement="auto"
                        maxMenuHeight={250}
                        menuShouldScrollIntoView={false}
                    />
                </div>
            </div>
        </FormField>

        <hr className="border-neutral-200" />

        {/* Minimum Booking & Max Pax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
                id="minimumBookingHours"
                label="Min. Booking Hours"
                variant="horizontal"
                type="text"
                placeholder="e.g. 2"
                value={details.minimumBookingHours}
                onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    handleInputChange("minimumBookingHours", onlyDigits);
                }}
                customRightContent={<span className="text-muted-foreground text-sm font-medium">hrs</span>}
                required
            />

            <Input
                id="maximumPax"
                label="Maximum Capacity"
                variant="horizontal"
                type="text"
                placeholder="e.g. 10"
                value={details.maximumPax ?? ""}
                onChange={(e) => {
                    const onlyDigits = e.target.value.replace(/\D/g, "");
                    handleInputChange("maximumPax", onlyDigits);
                }}
                customRightContent={<span className="text-muted-foreground text-sm font-medium">pax</span>}
                required
            />
        </div>

        <hr className="border-neutral-200" />

        {/* Space Type */}
        <FormField
            label="Space Type"
            description="Select all that apply"
            variant="horizontal"
            required
        >
            <div className="flex flex-wrap gap-2 w-full">
                {Array.from(new Set([...spaceTypes, ...(details.type || [])])).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeSelect(t)}
                        className={`
                                text-sm py-2 px-4 rounded-full border transition
                                ${details.type.includes(t)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary"
                            }
                            `}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </FormField>

        <hr className="border-neutral-200" />

        {/* Toggles */}
        <div className="space-y-6">
            <FormField
                label="Instant Booking"
                description="Allow guests to book without waiting for approval"
                variant="horizontal"
            >
                <div className="flex items-center w-full">
                    <Switch
                        checked={details.instantBooking}
                        onChange={(checked) => handleInputChange("instantBooking", !!checked)}
                        variant="bolt"
                    />
                </div>
            </FormField>

            <FormField
                label="Multiple Sets"
                description="Does this space have multiple sub-units?"
                variant="horizontal"
            >
                <div className="flex items-center w-full">
                    <Switch
                        checked={details.hasSets}
                        onChange={(checked) => handleInputChange("hasSets", !!checked)}
                    />
                </div>
            </FormField>
        </div>
    </div >
    );
};

export default OtherListingDetails;
