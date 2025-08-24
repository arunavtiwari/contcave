import React, { useMemo, useState } from "react";

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
    disabledStartTimes: readonly TimeHM[];
    disabledEndTimes: readonly TimeHM[];
    selectedDate: Date;
    operationalTimings?: ReservationOperationalTimings;
}

const TIME_SLOTS: TimeLabel[] = [
    "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
    "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
    "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
    "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
    "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
    "9:00 PM", "9:30 PM", "10:00 PM",
];

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
    if (h > 23 || min > 59) return NaN;
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
    disabledStartTimes,
    disabledEndTimes,
    selectedDate,
    operationalTimings,
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

    const visible = useMemo(() => TIME_SLOTS.slice(startIdx, endIdx + 1), [startIdx, endIdx]);

    const isReserved = (label: TimeLabel): boolean => {
        const m = toMinutes(label);
        if (Number.isNaN(m)) return false;
        return disabledIntervals.some(({ s, e }) => m >= s && m < e);
    };

    const violatesEndBeforeStart = (label: TimeLabel): boolean => {
        if (activeSegment !== "end" || !selectedStart) return false;
        const endM = toMinutes(label);
        const startM = toMinutes(selectedStart);
        if (Number.isNaN(endM) || Number.isNaN(startM)) return false;
        return endM <= startM;
    };

    const handleClick = (label: TimeLabel) => {
        onTimeSelect(to12hLabel(label), activeSegment);
    };

    const normStart = to12hLabel(selectedStart);
    const normEnd = to12hLabel(selectedEnd);

    return (
        <div className="p-4 pb-0">
            <div className="mb-4">
                <div className="flex justify-between bg-gray-200 p-1.5 rounded-xl">
                    <button
                        type="button"
                        className={`flex-1 px-4 py-1 text-center font-bold rounded-xl ${activeSegment === "start" ? "bg-white shadow-md" : "bg-transparent"
                            }`}
                        onClick={() => setActiveSegment("start")}
                    >
                        Start
                        <span className="block text-xs text-gray-500">
                            {normStart || "Please select"}
                        </span>
                    </button>
                    <button
                        type="button"
                        className={`flex-1 px-4 py-1 text-center font-bold rounded-xl ${activeSegment === "end" ? "bg-white shadow-md" : "bg-transparent"
                            }`}
                        onClick={() => setActiveSegment("end")}
                    >
                        End
                        <span className="block text-xs text-gray-500">
                            {normEnd || "Please select"}
                        </span>
                    </button>
                </div>
            </div>

            <div className="gap-4 grid grid-cols-3 h-[30vh] pr-1 overflow-y-auto pb-4">
                {visible.map((label) => {
                    const reserved = isReserved(label);
                    const orderBad = violatesEndBeforeStart(label);
                    const disabled = reserved || orderBad;
                    const isSelected =
                        (activeSegment === "start" && to12hLabel(label) === normStart) ||
                        (activeSegment === "end" && to12hLabel(label) === normEnd);

                    return (
                        <button
                            key={label}
                            type="button"
                            onClick={() => handleClick(label)}
                            disabled={disabled}
                            className={`rounded-xl px-4 py-2 text-sm border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? "border-black bg-black text-white" : "border-neutral-300 bg-transparent hover:border-black"
                                }`}
                        >
                            <span className={orderBad && !reserved ? "line-through" : ""}>
                                {label}
                            </span>
                            {reserved && <p className="text-xs py-0">Not available</p>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TimeSlotPicker;
