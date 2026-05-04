"use client";

import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { format, getDay, isBefore, isSameDay, startOfDay } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { getDayStatusAction, updateDayStatusAction } from "@/app/actions/listingActions";
import Input from "@/components/inputs/Input";
import Switch from "@/components/inputs/Switch";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

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

    const isDayEnabled = (date: Date) => {
        if (!startKey || !endKey) return true;
        const dayIndex = getDay(date);
        const startIndex = dayNameToIndex[startKey];
        const endIndex = dayNameToIndex[endKey];
        if (startIndex <= endIndex) return dayIndex >= startIndex && dayIndex <= endIndex;
        return dayIndex >= startIndex || dayIndex <= endIndex;
    };

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
            const formattedDate = format(selectedDate, "yyyy-MM-dd");
            if (lastFetchedDate.current === formattedDate) return;
            lastFetchedDate.current = formattedDate;
            setLoading(true);
            try {
                const data = await getDayStatusAction(listingId, formattedDate);
                setIsListingActive(data?.listingActive ?? true);
                setStartTime(formatTime(data?.startTime ?? defaultStartTime, "AM"));
                setEndTime(formatTime(data?.endTime ?? defaultEndTime, "PM"));
            } catch (e) {
                console.error("[ManageTimings] Failed to fetch day status", e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [selectedDate, listingId, defaultStartTime, defaultEndTime]);

    const handleDateChange = (newDate: Date | null) => {
        if (!newDate || isSameDay(selectedDate, newDate)) return;
        setSelectedDate(newDate);
    };

    const handleSave = async () => {
        const payload = {
            listingId,
            date: format(selectedDate, "yyyy-MM-dd"),
            listingActive: isListingActive,
            startTime,
            endTime,
        };
        try {
            const res = await updateDayStatusAction(payload);
            if (res.success) {
                toast.success("Data saved successfully!");
            } else {
                toast.error(res.error || "Error saving day status");
            }
        } catch (e) {
            console.error("[ManageTimings] Failed to save day status", e);
            toast.error("Error saving day status");
        }
    };


    if (!mounted) {
        return null;
    }

    return (
        <div className="flex items-center p-8 gap-12 bg-background justify-center rounded-2xl border border-border">
            <div className="border border-border rounded-xl w-fit overflow-hidden">
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateCalendar
                        value={selectedDate}
                        onChange={handleDateChange}
                        shouldDisableDate={(date) => {
                            if (isBefore(date, startOfDay(new Date()))) return true;
                            return !isDayEnabled(date);
                        }}
                        sx={{
                            ".Mui-selected": { color: "background", backgroundColor: "foreground!important" },
                            ".Mui-selected:hover": { color: "background", backgroundColor: "foreground!important" },
                            ".Mui-selected:focus, .Mui-selected:focus-visible": { color: "background", backgroundColor: "foreground!important", outline: "none" },
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
                        onColor="#10B981"
                        offColor="#D4D4D4"
                        styleVariant="bolt"
                        variant="horizontal"
                    />
                </div>

                <div className="flex flex-col w-full">
                    <span className="text-foreground text-lg font-semibold">Edit Timings</span>
                    {loading ? (
                        <div className="flex space-x-4 mt-2">
                            <div className="flex flex-col w-1/2 gap-2">
                                <Skeleton className="w-24 h-5.75 rounded-full" />
                                <Skeleton className="w-full h-10 rounded-xl" />
                            </div>
                            <div className="flex flex-col w-1/2 gap-2">
                                <Skeleton className="w-24 h-5.75 rounded-full" />
                                <Skeleton className="w-full h-10 rounded-xl" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex space-x-4 mt-2">
                            <Input
                                id="startTime"
                                label="Start Time"
                                type="time"
                                value={startTime}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartTime(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                id="endTime"
                                label="End Time"
                                type="time"
                                value={endTime}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndTime(e.target.value)}
                                className="flex-1"
                            />
                        </div>
                    )}
                </div>

                <Button
                    label="Save timings"
                    onClick={handleSave}
                    variant="default"
                    size="lg"
                    className="w-full rounded-xl text-sm font-bold"
                />
            </div>
        </div>
    );
}


