"use client";

import { useState, useEffect, useRef } from "react";
import ReactSwitch from "react-switch";
import * as React from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { FaBolt } from "react-icons/fa";
import dayjs from "dayjs";
import { toast } from "react-toastify";

// Map abbreviated day names to Day.js day indices (0 = Sunday, 1 = Monday, …)
const dayNameToIndex = {
    sun: 0,
    mon: 1,
    tue: 2,
    wed: 3,
    thu: 4,
    fri: 5,
    sat: 6,
};

export default function CalendarComponent({
    listingId,
    defaultStartTime,
    defaultEndTime,
    defaultStartDay, // e.g., "mon"
    defaultEndDay,   // e.g., "wed"
}) {
    function formatTime(timeStr, period = "AM") {
        let hour = parseInt(timeStr, 10);
        if (period === "PM" && hour < 12) {
            hour += 12;
        }
        return `${hour.toString().padStart(2, "0")}:00`;
    }

    // Helper to check if a given date falls on an enabled day (between defaultStartDay and defaultEndDay)
    const isDayEnabled = (date) => {
        const dayIndex = date.day();
        const startIndex = dayNameToIndex[defaultStartDay.toLowerCase()];
        const endIndex = dayNameToIndex[defaultEndDay.toLowerCase()];
        if (startIndex <= endIndex) {
            // Range does not wrap around the week (e.g., Mon to Wed)
            return dayIndex >= startIndex && dayIndex <= endIndex;
        } else {
            // Range wraps around (e.g., Fri to Tue)
            return dayIndex >= startIndex || dayIndex <= endIndex;
        }
    };

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [isListingActive, setIsListingActive] = useState(true);
    const [startTime, setStartTime] = useState(formatTime(defaultStartTime, "AM"));
    const [endTime, setEndTime] = useState(formatTime(defaultEndTime, "PM"));
    const [loading, setLoading] = useState(false);
    const lastFetchedDate = useRef("");

    useEffect(() => {
        const fetchData = async () => {
            const formattedDate = selectedDate.format("YYYY-MM-DD");

            if (lastFetchedDate.current === formattedDate) return;
            lastFetchedDate.current = formattedDate;

            setLoading(true);
            try {
                const res = await fetch(
                    `/api/dayStatus?listingId=${listingId}&date=${formattedDate}`
                );

                if (!res.ok) {
                    throw new Error("Failed to fetch data");
                }

                const data = await res.json();
                setIsListingActive(data.listingActive ?? true);
                setStartTime(
                    data.startTime
                        ? formatTime(data.startTime, "AM")
                        : formatTime(defaultStartTime, "AM")
                );
                setEndTime(
                    data.endTime
                        ? formatTime(data.endTime, "PM")
                        : formatTime(defaultEndTime, "PM")
                );
            } catch (error) {
                console.error("Error fetching data:", error);
                setIsListingActive(true);
                setStartTime(formatTime(defaultStartTime, "AM"));
                setEndTime(formatTime(defaultEndTime, "PM"));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedDate, listingId, defaultStartTime, defaultEndTime]);

    const handleDateChange = (newDate) => {
        if (!newDate || selectedDate.isSame(newDate, "day")) return;
        setSelectedDate(newDate);
    };

    const handleSave = async () => {
        const formattedDate = selectedDate.format("YYYY-MM-DD");

        const payload = {
            listingId,
            date: formattedDate,
            listingActive: isListingActive,
            startTime,
            endTime,
        };

        try {
            const res = await fetch("/api/dayStatus", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error("Error saving day status");
            }

            const data = await res.json();
            console.log("Saved Data:", data);
            toast.success("Data saved successfully!");
        } catch (error) {
            console.error("Error saving day status:", error);
            toast.error("Error saving day status");
        }
    };

    return (
        <div className="flex items-center p-6 gap-30 bg-white justify-center">
            <div className="border border-neutral-300 shadow-lg rounded-lg w-fit">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar
                        value={selectedDate}
                        onChange={handleDateChange}
                        // Disable past dates and any dates not falling within the allowed days
                        shouldDisableDate={(date) => {
                            // Disable past days
                            if (date.isBefore(dayjs(), "day")) return true;
                            // Disable dates outside the specified day range
                            return !isDayEnabled(date);
                        }}
                        sx={{
                            ".Mui-selected": {
                                color: "white",
                                backgroundColor: "black!important",
                            },
                            ".Mui-selected:hover": {
                                color: "white",
                                backgroundColor: "black!important",
                            },
                            ".Mui-selected:focus, .Mui-selected:focus-visible": {
                                color: "white",
                                backgroundColor: "black!important",
                                outline: "none",
                            },
                        }}
                    />
                </LocalizationProvider>
            </div>

            <div className="flex flex-col gap-8 w-1/2">
                <div className="flex items-center justify-between w-full gap-5">
                    <span className="text-lg font-semibold">Listing Status Today</span>
                    <ReactSwitch
                        checked={isListingActive}
                        onChange={setIsListingActive}
                        onColor="#34D399"
                        offColor="#D1D5DB"
                        uncheckedIcon={false}
                        offHandleColor="#000"
                        activeBoxShadow="0 0 2px 3px #000"
                        checkedIcon={false}
                        height={30}
                        handleDiameter={20}
                        checkedHandleIcon={
                            <FaBolt color="#FFD700" className="w-full h-full py-[2px]" />
                        }
                    />
                </div>

                <div className="flex flex-col w-full">
                    <span className="text-black text-lg font-semibold">Edit Timings</span>
                    {loading ? (
                        <div className="flex space-x-4 mt-2">
                            <div className="flex flex-col w-1/2 gap-2">
                                <div className="w-24 h-[23px] bg-gray-200 rounded-full animate-pulse"></div>
                                <div className="w-full h-10 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                            <div className="flex flex-col w-1/2 gap-2">
                                <div className="w-24 h-[23px] bg-gray-200 rounded-full animate-pulse"></div>
                                <div className="w-full h-10 bg-gray-200 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex space-x-4 mt-2">
                            <div className="flex flex-col w-1/2 gap-2">
                                <label className="text-black">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="border border-black rounded-full px-4 py-2 text-sm font-medium text-black focus:border-black focus:ring-1 focus:ring-black hover:border-black appearance-none"
                                />
                            </div>
                            <div className="flex flex-col w-1/2 gap-2">
                                <label className="text-black">End Time</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="border border-black rounded-full px-4 py-2 text-sm font-medium text-black focus:border-black focus:ring-1 focus:ring-black hover:border-black appearance-none"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSave}
                    className="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:opacity-90"
                >
                    SAVE
                </button>
            </div>
        </div>
    );
}
