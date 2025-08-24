import React, { useCallback, useMemo, useState, useEffect } from "react";
import { FaBolt } from "react-icons/fa";
import Select from "react-select";
import ReactSwitch from "react-switch";

export type ListingDetails = {
    carpetArea: string;
    operationalDays: { start?: string; end?: string };
    operationalHours: { start?: string; end?: string };
    minimumBookingHours: string;
    maximumPax: string;
    instantBooking: boolean;
    type: string[];
    bookingApprovalCount?: boolean;
};

type Props = {
    onDetailsChange: (details: ListingDetails) => void;
};

const types = [
    "Fashion shoot",
    "Product shoot",
    "Podcast",
    "Recording Studio",
    "Film Shoot",
    "Outdoor Event",
    "Content shoot",
    "Pre-Wedding",
    "Meetings",
    "Workshops",
    "Photo Shoot",
];

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

const selectTheme = (theme: any) => ({
    ...theme,
    borderRadius: 10,
    colors: { ...theme.colors, primary: "black", primary25: "#F3F4F6", primary50: "#E5E7EB" },
});

const selectClasses = {
    input: () => "text-lg cursor-pointer",
    option: () => "text-lg cursor-pointer",
};

const OtherListingDetails: React.FC<Props> = ({ onDetailsChange }) => {
    const timeOptions = useMemo(() => buildTimeOptions(30), []);
    const [details, setDetails] = useState<ListingDetails>({
        carpetArea: "",
        operationalDays: { start: "Mon", end: "Sun" },
        operationalHours: { start: "9:00 AM", end: "9:00 PM" },
        minimumBookingHours: "",
        maximumPax: "",
        instantBooking: false,
        type: [],
        bookingApprovalCount: false,
    });

    useEffect(() => {
        onDetailsChange(details);
    }, [details, onDetailsChange]);

    const handleInputChange = useCallback((field: keyof ListingDetails, value: any) => {
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
                    Carpet Area
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
                        Operational Days
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
                    <label className="font-medium text-sm w-[40vw]">Opening Hours</label>
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
                    <label className="font-medium text-sm w-[40vw]">Minimum Booking Hours</label>
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
                    Maximum Pax
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
                <ReactSwitch
                    checked={details.instantBooking}
                    onChange={(checked) => handleInputChange("instantBooking", checked ? true : false)}
                    offColor="#d1d5db"
                    onColor="#000"
                    uncheckedIcon={false}
                    offHandleColor="#000"
                    activeBoxShadow="0 0 2px 3px #000"
                    checkedIcon={false}
                    height={30}
                    handleDiameter={20}
                    checkedHandleIcon={<FaBolt color="#FFD700" className="w-full h-full py-[2px]" />}
                />
            </div>

            <div className="flex justify-between items-center">
                <label className="text-sm font-medium mb-1 w-[40vw]">Require host approval before confirming?</label>
                <ReactSwitch
                    checked={!!details.bookingApprovalCount}
                    onChange={(checked) => handleInputChange("bookingApprovalCount", checked)}
                    offColor="#d1d5db"
                    onColor="#000"
                    uncheckedIcon={false}
                    offHandleColor="#000"
                    checkedIcon={false}
                    height={24}
                    handleDiameter={18}
                />
            </div>

            <hr />

            <div className="justify-between items-center">
                <label className="text-sm font-medium mb-1 w-[40vw]">
                    <strong>TYPE</strong>
                </label>
                <div className="flex flex-wrap gap-2 w-100 mt-2">
                    {types.map((t) => (
                        <button
                            key={t}
                            onClick={() => handleTypeSelect(t)}
                            className={`${details.type.includes(t) ? "bg-black text-white" : "bg-gray-200 text-gray-800"} text-sm py-1 px-3 rounded-full`}
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
