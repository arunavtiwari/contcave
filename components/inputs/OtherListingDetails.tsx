import React, { useCallback, useState, useEffect } from "react";
import { FaBolt } from "react-icons/fa";
import Select from "react-select";
import ReactSwitch from "react-switch";

export type ListingDetails = {
    carpetArea: string;
    operationalDays: { start?: string; end?: string };
    operationalHours: { start?: string; end?: string };
    minimumBookingHours: string;
    maximumPax: number | "";             
    instantBooking: boolean;               
    type: string[];                      
    bookingApprovalCount?: boolean;       
};

type Props = {
    onDetailsChange: (details: ListingDetails) => void;
};

const OtherListingDetails: React.FC<Props> = ({ onDetailsChange }) => {
    const [details, setDetails] = useState<ListingDetails>({
        carpetArea: "",
        operationalDays: { start: "mon", end: "sun" },
        operationalHours: { start: "06:00", end: "22:00" },
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
        { value: "mon", label: "Monday" },
        { value: "tue", label: "Tuesday" },
        { value: "wed", label: "Wednesday" },
        { value: "thu", label: "Thursday" },
        { value: "fri", label: "Friday" },
        { value: "sat", label: "Saturday" },
        { value: "sun", label: "Sunday" },
    ];

    return (
        <div className="space-y-4">
            {/* Property Specifications */}
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

            {/* Timings */}
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
                            classNames={{ input: () => "text-lg cursor-pointer", option: () => "text-lg cursor-pointer" }}
                            theme={(theme) => ({
                                ...theme,
                                borderRadius: 10,
                                colors: { ...theme.colors, primary: "black", primary25: "#F3F4F6", primary50: "#E5E7EB" },
                            })}
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
                            classNames={{ input: () => "text-lg cursor-pointer", option: () => "text-lg cursor-pointer" }}
                            theme={(theme) => ({
                                ...theme,
                                borderRadius: 10,
                                colors: { ...theme.colors, primary: "black", primary25: "#F3F4F6", primary50: "#E5E7EB" },
                            })}
                        />
                    </div>
                </div>

                <div className="flex items-center">
                    <label className="font-medium text-sm w-[40vw]">Opening Hours</label>
                    <div className="flex items-center space-x-2 justify-end">
                        <input
                            type="text"
                            placeholder="HH:MM"
                            className="border rounded-full w-30 py-2 text-center"
                            value={details.operationalHours.start || ""}
                            onChange={(e) =>
                                handleInputChange("operationalHours", {
                                    ...details.operationalHours,
                                    start: e.target.value,
                                })
                            }
                        />
                        <span>-</span>
                        <input
                            type="text"
                            placeholder="HH:MM"
                            className="border rounded-full w-30 py-2 text-center"
                            value={details.operationalHours.end || ""}
                            onChange={(e) =>
                                handleInputChange("operationalHours", {
                                    ...details.operationalHours,
                                    end: e.target.value,
                                })
                            }
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

            {/* Accommodation */}
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium w-[40vw]">
                    <strong>ACCOMMODATION</strong>
                    <br />
                    Maximum Pax
                </label>
                <input
                    type="number"
                    placeholder="6"
                    className="border rounded-full w-1/3 py-2 pr-3 text-center"
                    value={details.maximumPax}
                    onChange={(e) => {
                        const v = e.target.value;
                        handleInputChange("maximumPax", v === "" ? "" : Number(v));
                    }}
                />
            </div>

            <hr />

            {/* Booking */}
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

            {/* Type */}
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
