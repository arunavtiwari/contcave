import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select, { Theme } from "react-select";

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

const dayOptions = [
    { value: "Mon", label: "Monday" },
    { value: "Tue", label: "Tuesday" },
    { value: "Wed", label: "Wednesday" },
    { value: "Thu", label: "Thursday" },
    { value: "Fri", label: "Friday" },
    { value: "Sat", label: "Saturday" },
    { value: "Sun", label: "Sunday" },
];

const buildTimeOptions = (stepMinutes = 30) => {
    const out: { value: string; label: string }[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += stepMinutes) {
            const am = h < 12;
            const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const mm = String(m).padStart(2, "0");
            const label = `${h12}:${mm} ${am ? "AM" : "PM"}`;
            out.push({ value: label, label });
        }
    }
    return out;
};

const selectTheme = (theme: Theme) => ({
    ...theme,
    borderRadius: 10,
    colors: { ...theme.colors, primary: "black", primary25: "#F3F4F6", primary50: "#E5E7EB" },
});

const selectClasses = {
    input: () => "text-lg cursor-pointer",
    option: () => "text-lg cursor-pointer",
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

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium w-[40vw]">
                    <strong>PROPERTY SPECIFICATIONS</strong>
                    <br />
                    Carpet Area <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                    type="text"
                    placeholder="290 sqft"
                    className="border py-2 rounded-full w-1/3 text-center"
                    value={details.carpetArea}
                    onChange={(e) => handleInputChange("carpetArea", e.target.value)}
                />
            </div>

            <hr />

            <div className="space-y-4">
                <div className="flex items-center">
                    <label className="font-medium text-sm w-[40vw]">
                        <strong>TIMINGS</strong>
                        <br />
                        Operational Days <span className="text-rose-500 ml-1">*</span>
                    </label>
                    <div className="flex items-center space-x-2 justify-end w-full">
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
                            classNames={selectClasses}
                            theme={selectTheme}
                        />
                        <span>-</span>
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
                            classNames={selectClasses}
                            theme={selectTheme}
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <label className="font-medium text-sm w-[40vw]">Opening Hours <span className="text-rose-500 ml-1">*</span></label>
                    <div className="flex items-center space-x-2 justify-end w-full">
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
                            classNames={selectClasses}
                            theme={selectTheme}
                        />
                        <span>-</span>
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
                            classNames={selectClasses}
                            theme={selectTheme}
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <label className="font-medium text-sm w-[40vw]">Minimum Booking Hours <span className="text-rose-500 ml-1">*</span></label>
                    <input
                        type="text"
                        placeholder="2 hrs"
                        className="border rounded-full w-1/3 py-2 pr-3 text-center"
                        value={details.minimumBookingHours}
                        onChange={(e) => handleInputChange("minimumBookingHours", e.target.value)}
                    />
                </div>
            </div>

            <hr />

            <div className="flex justify-between items-center">
                <label className="text-sm font-medium w-[40vw]">
                    <strong>ACCOMMODATION</strong>
                    <br />
                    Maximum Pax <span className="text-rose-500 ml-1">*</span>
                </label>
                <input
                    type="text"
                    placeholder="6"
                    className="border rounded-full w-1/3 py-2 pr-3 text-center"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    value={details.maximumPax ?? ""}
                    onChange={(e) => {
                        const onlyDigits = e.target.value.replace(/\D/g, "");
                        handleInputChange("maximumPax", onlyDigits);
                    }}
                />
            </div>

            <hr />

            <div className="flex justify-between items-center">
                <label className="text-sm font-medium mb-1 w-[40vw]">
                    <strong>BOOKING</strong>
                    <br />
                    Instant Book
                </label>
                <Switch
                    checked={details.instantBooking}
                    onChange={(checked) => handleInputChange("instantBooking", !!checked)}
                    variant="bolt"
                />
            </div>

            <hr />

            <div className="flex justify-between items-center">
                <label className="text-sm font-medium mb-1 w-[40vw]">
                    <strong>MULTI-SET</strong>
                    <br />
                    Enable multiple bookable sets
                </label>
                <Switch
                    checked={details.hasSets}
                    onChange={(checked) => handleInputChange("hasSets", !!checked)}
                />
            </div>
            {details.hasSets && (
                <p className="text-xs text-neutral-500 -mt-2">
                    Configure your sets (studios, rooms, etc.) in the next step.
                </p>
            )}

            <hr />

            <div className="justify-between items-center">
                <label className="text-sm font-medium mb-1">
                    <strong>TYPE</strong> <span className="text-rose-500 ml-1">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mt-2">
                    {spaceTypes.map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTypeSelect(t)}
                            className={`${details.type.includes(t) ? "bg-black text-white" : "bg-gray-200 text-gray-800"
                                } text-sm py-1 px-3 rounded-full`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OtherListingDetails;
