import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select, { GroupBase, StylesConfig } from "react-select";

import Switch from "@/components/ui/Switch";
import { spaceTypes } from "@/constants/spaceTypes";

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
    onDetailsChange: (details: ListingDetails) => void;
    initialDetails?: ListingDetails;
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

const buildTimeOptions = (intervalMinutes: number): OptionType[] => {
    const options: OptionType[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += intervalMinutes) {
            const hour = h % 12 || 12;
            const period = h < 12 ? "AM" : "PM";
            const minute = m.toString().padStart(2, "0");
            const label = `${hour}:${minute} ${period}`;
            options.push({ value: label, label });
        }
    }
    return options;
};

const customStyles: StylesConfig<OptionType, false, GroupBase<OptionType>> = {
    control: (provided, state) => ({
        ...provided,
        backgroundColor: "white",
        borderWidth: "2px",
        borderColor: state.isFocused ? "black" : "#e5e5e5",
        borderRadius: "0.75rem",
        padding: "0 6px",
        boxShadow: "none",
        minHeight: "48px",
        height: "48px",
        "&:hover": {
            borderColor: "#d4d4d4",
        },
    }),
    input: (provided) => ({
        ...provided,
        fontSize: "1rem",
        margin: 0,
        padding: 0,
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: 0,
    }),
    singleValue: (provided) => ({
        ...provided,
        margin: 0,
    }),
    option: (provided, state) => ({
        ...provided,
        cursor: "pointer",
        backgroundColor: state.isSelected ? "black" : state.isFocused ? "#f3f4f6" : "white",
        color: state.isSelected ? "white" : "black",
    }),
    menu: (provided) => ({
        ...provided,
        borderRadius: "0.75rem",
        overflow: "hidden",
        zIndex: 9999,
    }),
};

const OtherListingDetails: React.FC<Props> = ({ onDetailsChange, initialDetails }) => {
    const timeOptions = useMemo(() => buildTimeOptions(30), []);
    const [details, setDetails] = useState<ListingDetails>(
        initialDetails || {
            carpetArea: "",
            operationalDays: { start: "Mon", end: "Sun" },
            operationalHours: { start: "9:00 AM", end: "9:00 PM" },
            minimumBookingHours: "",
            maximumPax: "",
            instantBooking: false,
            type: [],
            hasSets: false,
        }
    );

    useEffect(() => {
        if (initialDetails) {
            setDetails(initialDetails);
        }
    }, [initialDetails]);

    useEffect(() => {
        onDetailsChange(details);
    }, [details, onDetailsChange]);

    const handleInputChange = useCallback((field: keyof ListingDetails, value: string | boolean | string[] | { start?: string; end?: string }) => {
        setDetails((prev) => ({ ...prev, [field]: value }));
    }, []);

    const handleTypeSelect = (t: string) => {
        setDetails((prev) => {
            const exists = prev.type.includes(t);
            return { ...prev, type: exists ? prev.type.filter((x) => x !== t) : [...prev.type, t] };
        });
    };

    return (<div className="flex flex-col gap-8">
        {/* Carpet Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <label className="text-sm font-medium text-gray-700">
                Carpet Area <span className="text-rose-500">*</span>
                <span className="block text-xs text-gray-500 font-normal mt-0.5">Total floor area of the space</span>
            </label>
            <div className="md:col-span-2">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="e.g. 2500"
                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-black transition"
                        value={details.carpetArea}
                        onChange={(e) => handleInputChange("carpetArea", e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                        sq ft
                    </span>
                </div>
            </div>
        </div>

        <hr className="border-neutral-200" />

        {/* Operational Days */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">
                Operational Days <span className="text-rose-500">*</span>
                <span className="block text-xs text-gray-500 font-normal mt-0.5">Days when the space is open</span>
            </label>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
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
                />
            </div>
        </div>

        {/* Operational Hours */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">
                Opening Hours <span className="text-rose-500">*</span>
                <span className="block text-xs text-gray-500 font-normal mt-0.5">Daily operating hours</span>
            </label>
            <div className="md:col-span-2 grid grid-cols-2 gap-3">
                <Select
                    options={timeOptions}
                    value={timeOptions.find((t) => t.value === (details.operationalHours.start || "")) || null}
                    onChange={(sel) =>
                        handleInputChange("operationalHours", {
                            ...details.operationalHours,
                            start: sel?.value || "",
                        })
                    }
                    placeholder="Start Time"
                    styles={customStyles}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                />
                <Select
                    options={timeOptions}
                    value={timeOptions.find((t) => t.value === (details.operationalHours.end || "")) || null}
                    onChange={(sel) =>
                        handleInputChange("operationalHours", {
                            ...details.operationalHours,
                            end: sel?.value || "",
                        })
                    }
                    placeholder="End Time"
                    styles={customStyles}
                    menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                />
            </div>
        </div>

        <hr className="border-neutral-200" />

        {/* Minimum Booking & Max Pax */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                    Min. Booking Hours <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="number"
                        placeholder="e.g. 2"
                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-black transition"
                        value={details.minimumBookingHours}
                        onChange={(e) => handleInputChange("minimumBookingHours", e.target.value)}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                        hrs
                    </span>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                    Maximum Capacity <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="e.g. 10"
                        className="w-full px-4 py-2.5 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-black transition"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={details.maximumPax ?? ""}
                        onChange={(e) => {
                            const onlyDigits = e.target.value.replace(/\D/g, "");
                            handleInputChange("maximumPax", onlyDigits);
                        }}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                        pax
                    </span>
                </div>
            </div>
        </div>

        <hr className="border-neutral-200" />

        {/* Space Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <label className="text-sm font-medium text-gray-700 pt-2">
                Space Type <span className="text-rose-500">*</span>
                <span className="block text-xs text-gray-500 font-normal mt-0.5">Select all that apply</span>
            </label>
            <div className="md:col-span-2 flex flex-wrap gap-2">
                {spaceTypes.map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => handleTypeSelect(t)}
                        className={`
                                text-sm py-2 px-4 rounded-full border transition
                                ${details.type.includes(t)
                                ? "bg-black text-white border-black"
                                : "bg-white text-gray-700 border-neutral-200 hover:border-black"
                            }
                            `}
                    >
                        {t}
                    </button>
                ))}
            </div>
        </div>

        <hr className="border-neutral-200" />

        {/* Toggles */}
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <div className="font-medium">Instant Booking</div>
                    <div className="text-sm text-gray-500">Allow guests to book without waiting for approval</div>
                </div>
                <Switch
                    checked={details.instantBooking}
                    onChange={(checked) => handleInputChange("instantBooking", !!checked)}
                    variant="bolt"
                />
            </div>

            <div className="flex justify-between items-center">
                <div>
                    <div className="font-medium">Multiple Sets</div>
                    <div className="text-sm text-gray-500">Does this space have multiple sub-units?</div>
                </div>
                <Switch
                    checked={details.hasSets}
                    onChange={(checked) => handleInputChange("hasSets", !!checked)}
                />
            </div>
        </div>
    </div>
    );
};

export default OtherListingDetails;
