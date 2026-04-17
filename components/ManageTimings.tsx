"use client";

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import dayjs, { Dayjs } from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import Skeleton from "@/components/ui/Skeleton";
import Switch from "@/components/ui/Switch";

const dayNameToIndex: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

type Props = {
    listingId: string;
    defaultStartTime: string;
    defaultEndTime: string;
    defaultStartDay?: string;
    defaultEndDay?: string;
};

function normalizeDayKey(key?: string): string | null {
    if (!key) return null;
    const k = key.trim().slice(0, 3).toLowerCase();
    return k in dayNameToIndex ? k : null;
}

function formatTime(input: string, period?: "AM" | "PM"): string {
    const s = String(input).trim();
    if (/^\d{1,2}:\d{2}$/.test(s)) return s;
    let hour = parseInt(s, 10);
    if (Number.isNaN(hour)) hour = 0;
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return `${String(hour).padStart(2, "0")}:00`;
}

export default function CalendarComponent({
    listingId,
    defaultStartTime,
    defaultEndTime,
    defaultStartDay,
    defaultEndDay,
}: Props) {
    const startKey = useMemo(() => normalizeDayKey(defaultStartDay), [defaultStartDay]);
    const endKey = useMemo(() => normalizeDayKey(defaultEndDay), [defaultEndDay]);

    const isDayEnabled = (date: Dayjs) => {
        if (!startKey || !endKey) return true;
        const dayIndex = date.day();
        const startIndex = dayNameToIndex[startKey];
        const endIndex = dayNameToIndex[endKey];
        if (startIndex <= endIndex) return dayIndex >= startIndex && dayIndex <= endIndex;
        return dayIndex >= startIndex || dayIndex <= endIndex;
    };

    const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
    const [isListingActive, setIsListingActive] = useState(true);
    const [startTime, setStartTime] = useState<string>(formatTime(defaultStartTime, "AM"));
    const [endTime, setEndTime] = useState<string>(formatTime(defaultEndTime, "PM"));
    const [loading, setLoading] = useState(false);
    const lastFetchedDate = useRef<string>("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            const formattedDate = selectedDate.format("YYYY-MM-DD");
            if (lastFetchedDate.current === formattedDate) return;
            lastFetchedDate.current = formattedDate;
            setLoading(true);
            try {
                const res = await fetch(`/api/dayStatus?listingId=${encodeURIComponent(listingId)}&date=${formattedDate}`);
                if (!res.ok) throw new Error("Failed to fetch data");
                const data = await res.json();
                setIsListingActive(data.listingActive ?? true);
                setStartTime(formatTime(data.startTime ?? defaultStartTime, "AM"));
                setEndTime(formatTime(data.endTime ?? defaultEndTime, "PM"));
            } catch {
                setIsListingActive(true);
                setStartTime(formatTime(defaultStartTime, "AM"));
                setEndTime(formatTime(defaultEndTime, "PM"));
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate, listingId, defaultStartTime, defaultEndTime]);

    const handleDateChange = (newDate: Dayjs | null) => {
        if (!newDate || selectedDate.isSame(newDate, "day")) return;
        setSelectedDate(newDate);
    };

    const handleSave = async () => {
        const payload = {
            listingId,
            date: selectedDate.format("YYYY-MM-DD"),
            listingActive: isListingActive,
            startTime,
            endTime,
        };
        try {
            const res = await fetch("/api/dayStatus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error("Save failed");
            await res.json();
            toast.success("Data saved successfully!");
        } catch {
            toast.error("Error saving day status");
        }
    };

    if (!mounted) {
        return null;
    }

    return (
        <div className="flex items-center p-6 gap-30 bg-white justify-center">
            <div className="border border-neutral-300 shadow-lg rounded-lg w-fit">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar
                        value={selectedDate}
                        onChange={handleDateChange}
                        shouldDisableDate={(date) => {
                            if (date.isBefore(dayjs().startOf("day"), "day")) return true;
                            return !isDayEnabled(date);
                        }}
                        sx={{
                            ".Mui-selected": { color: "white", backgroundColor: "black!important" },
                            ".Mui-selected:hover": { color: "white", backgroundColor: "black!important" },
                            ".Mui-selected:focus, .Mui-selected:focus-visible": { color: "white", backgroundColor: "black!important", outline: "none" },
                        }}
                    />
                </LocalizationProvider>
            </div>

            <div className="flex flex-col gap-8 w-1/2">
                <div className="flex items-center justify-between w-full gap-5">
                    <span className="text-lg font-semibold">Listing Status Today</span>
                    <Switch
                        checked={isListingActive}
                        onChange={setIsListingActive}
                        onColor="#34D399"
                        variant="bolt"
                    />
                </div>

                <div className="flex flex-col w-full">
                    <span className="text-black text-lg font-semibold">Edit Timings</span>
                    {loading ? (
                        <div className="flex space-x-4 mt-2">
                            <div className="flex flex-col w-1/2 gap-2">
                                <Skeleton className="w-24 h-5.75 rounded-full" />
                                <Skeleton className="w-full h-10 rounded-full" />
                            </div>
                            <div className="flex flex-col w-1/2 gap-2">
                                <Skeleton className="w-24 h-5.75 rounded-full" />
                                <Skeleton className="w-full h-10 rounded-full" />
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

                <button onClick={handleSave} className="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:opacity-90">
                    SAVE
                </button>
            </div>
        </div>
    );
}
