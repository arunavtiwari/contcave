"use client";

import React, { useCallback, useMemo, useState } from "react";

type TimeLabel = string;
type TimeSlot = TimeLabel | null;
type TimeHM = `${number}${number}:${number}${number}`;

type ReservationOperationalTimings = {
    operationalHours?: { start?: string; end?: string };
};

interface TimeSlotPickerProps {
    onTimeSelect: (time: TimeSlot, field: "start" | "end") => void;
    selectedStart: TimeSlot;
    selectedEnd: TimeSlot;
    disabledStartTimes?: readonly TimeHM[];
    disabledEndTimes?: readonly TimeHM[];
    selectedDate?: Date | null;
    operationalTimings?: ReservationOperationalTimings;
    minBookingMinutes?: number;
}

import { TIME_SLOTS } from "@/constants/timeSlots";

const ampmToMinutes = (label: string): number => {
    const m = label.match(/^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i);
    if (!m) return NaN;
    let h = Number(m[1]);
    const min = Number(m[2]);
    const period = m[3].toUpperCase();
    if (period === "PM" && h < 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return h * 60 + min;
};
const hhmmToMinutes = (hhmm: string): number => {
    const m = hhmm.match(/^(\d{1,2}):([0-5]\d)$/);
    if (!m) return NaN;
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h * 60 + min;
};
const toMinutes = (s?: string | null): number => {
    if (!s) return NaN;
    const m12 = ampmToMinutes(s);
    if (!Number.isNaN(m12)) return m12;
    const m24 = hhmmToMinutes(s);
    return m24;
};
const to12hLabel = (input?: string | null): string => {
    const s = String(input ?? "").trim();
    if (!s) return "";
    const got12 = s.match(/^(\d{1,2}):([0-5]\d)\s*([AP]M)$/i);
    if (got12) {
        const h = String(parseInt(got12[1], 10));
        const m = got12[2];
        const ap = got12[3].toUpperCase();
        return `${h}:${m} ${ap}`;
    }
    const got24 = s.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (got24) {
        let h = parseInt(got24[1], 10);
        const m = got24[2];
        const ap = h >= 12 ? "PM" : "AM";
        h = h % 12;
        if (h === 0) h = 12;
        return `${h}:${m} ${ap}`;
    }
    return s;
};

function resolveOperationalRange(ops?: ReservationOperationalTimings) {
    const rawStart = ops?.operationalHours?.start?.trim();
    const rawEnd = ops?.operationalHours?.end?.trim();

    const labelMinutes = TIME_SLOTS.map(ampmToMinutes);
    const toMin = (s?: string): number | null => {
        if (!s) return null;
        const idx = TIME_SLOTS.indexOf(to12hLabel(s));
        if (idx >= 0) return labelMinutes[idx];
        const m = toMinutes(s);
        return Number.isNaN(m) ? null : m;
    };

    const startMin = toMin(rawStart) ?? labelMinutes[0];
    const endMin = toMin(rawEnd) ?? labelMinutes[labelMinutes.length - 1];

    let startIdx = 0;
    while (startIdx < labelMinutes.length && labelMinutes[startIdx] < startMin) startIdx++;
    let endIdx = labelMinutes.length - 1;
    while (endIdx >= 0 && labelMinutes[endIdx] > endMin) endIdx--;

    if (endIdx < startIdx) {
        startIdx = 0;
        endIdx = labelMinutes.length - 1;
    }
    return { startIdx, endIdx };
}

const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
    onTimeSelect,
    selectedStart,
    selectedEnd,
    disabledStartTimes = [],
    disabledEndTimes = [],
    selectedDate,
    operationalTimings,
    minBookingMinutes = 60,
}) => {
    const [activeSegment, setActiveSegment] = useState<"start" | "end">("start");

    const disabledIntervals = useMemo(() => {
        const n = Math.min(disabledStartTimes.length, disabledEndTimes.length);
        const out: Array<{ s: number; e: number }> = [];
        for (let i = 0; i < n; i++) {
            const s = toMinutes(disabledStartTimes[i]);
            const e = toMinutes(disabledEndTimes[i]);
            if (!Number.isNaN(s) && !Number.isNaN(e) && s < e) out.push({ s, e });
        }
        return out;
    }, [disabledStartTimes, disabledEndTimes]);

    const { startIdx, endIdx } = useMemo(
        () => resolveOperationalRange(operationalTimings),
        [operationalTimings]
    );
    const visible = useMemo(
        () => TIME_SLOTS.slice(startIdx, endIdx + 1),
        [startIdx, endIdx]
    );

    const isReserved = useCallback(
        (label: TimeLabel): boolean => {
            const m = toMinutes(label);
            if (Number.isNaN(m)) return false;
            return disabledIntervals.some(({ s, e }) => m >= s && m < e);
        },
        [disabledIntervals]
    );

    const normStart = to12hLabel(selectedStart);
    const normEnd = to12hLabel(selectedEnd);

    const violatesEndRequirement = useCallback(
        (label: TimeLabel): boolean => {
            if (activeSegment !== "end" || !normStart) return false;
            const endM = toMinutes(label);
            const startM = toMinutes(normStart);
            if (Number.isNaN(endM) || Number.isNaN(startM)) return false;
            return endM < startM + Math.max(0, minBookingMinutes);
        },
        [activeSegment, normStart, minBookingMinutes]
    );

    const handleClick = useCallback(
        (label: TimeLabel) => {
            const normalized = to12hLabel(label);

            if (activeSegment === "start") {
                if (normEnd) {
                    const startM = toMinutes(normalized);
                    const endM = toMinutes(normEnd);
                    if (!Number.isNaN(startM) && !Number.isNaN(endM) && endM < startM + minBookingMinutes) {
                        onTimeSelect(null, "end");
                    }
                }
                onTimeSelect(normalized, "start");
                setActiveSegment("end");
            } else {
                if (violatesEndRequirement(normalized)) return;
                onTimeSelect(normalized, "end");
            }
        },
        [activeSegment, normEnd, minBookingMinutes, onTimeSelect, violatesEndRequirement]
    );

    const noDatePicked = !selectedDate;

    return (
        <div className="p-4 pb-0" role="group" aria-label="Time slot picker">

            <div className="flex justify-between bg-gray-200 p-1.5 rounded-xl">
                <button
                    type="button"
                    className={`flex-1 px-4 py-1 text-center font-bold rounded-xl ${activeSegment === "start" ? "bg-white shadow-sm" : "bg-transparent"
                        }`}
                    onClick={() => setActiveSegment("start")}
                    disabled={noDatePicked}
                >
                    Start
                    <span className="block text-xs text-gray-500">
                        {normStart || (noDatePicked ? "Pick a date first" : "Please select")}
                    </span>
                </button>
                <button
                    type="button"
                    className={`flex-1 px-4 py-1 text-center font-bold rounded-xl ${activeSegment === "end" ? "bg-white shadow-sm" : "bg-transparent"
                        }`}
                    onClick={() => setActiveSegment("end")}
                    disabled={noDatePicked}
                >
                    End
                    <span className="block text-xs text-gray-500">
                        {normEnd || (noDatePicked ? "Pick a date first" : "Please select")}
                    </span>
                </button>
            </div>

            {noDatePicked ? (
                <div className="p-4 text-sm text-neutral-600">
                    Please pick a date to see available time slots.
                </div>
            ) : (
                <>

                    <p className="px-1 pb-2 mt-2 text-xs text-neutral-500">
                        Minimum booking: {minBookingMinutes} minutes
                    </p>

                    <div className="gap-4 grid grid-cols-3 h-[30vh] pr-1 overflow-y-auto pb-4">
                        {visible.map((label) => {
                            const reserved = isReserved(label);
                            const tooShort = violatesEndRequirement(label);
                            const disabled = reserved || (activeSegment === "end" && tooShort);
                            const selected =
                                (activeSegment === "start" && to12hLabel(label) === normStart) ||
                                (activeSegment === "end" && to12hLabel(label) === normEnd);

                            return (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleClick(label)}
                                    disabled={disabled}
                                    className={`rounded-xl px-4 py-2 text-sm border transition-colors ${selected
                                        ? "border-black bg-black text-white"
                                        : disabled
                                            ? "border-neutral-200 bg-neutral-100 text-neutral-400 cursor-not-allowed"
                                            : "border-neutral-300 bg-transparent hover:border-black"
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default TimeSlotPicker;
