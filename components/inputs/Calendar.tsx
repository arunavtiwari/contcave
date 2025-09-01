import React from "react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { Calendar as ReactDateRangeCalendar } from "react-date-range";
import type { DayKey, OperationalDays } from "@/types/scheduling";

type Props = {
  value?: Date | null;
  onChange: (value: Date | null | undefined) => void;
  disabledDates?: Date[];
  allowedDays?: DayKey[] | OperationalDays;
  minDate?: Date;
};

const DAY_ORDER: DayKey[] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function jsWeekdayToMon0Index(jsWeekday: number) {
  return (jsWeekday + 6) % 7;
}

function isDaysList(obj: OperationalDays): obj is { days: DayKey[] } {
  return "days" in obj && Array.isArray((obj as any).days);
}
function isRange(obj: OperationalDays): obj is { start: DayKey; end: DayKey } {
  return "start" in obj && "end" in obj;
}

type Normalized =
  | { type: "list"; set: Set<DayKey> }
  | { type: "range"; start: number; end: number }
  | null;

function normalizeAllowed(allowed?: DayKey[] | OperationalDays): Normalized {
  if (!allowed) return null;

  if (Array.isArray(allowed)) {
    return { type: "list", set: new Set(allowed) };
  }

  if (isDaysList(allowed)) {
    return { type: "list", set: new Set(allowed.days) };
  }

  if (isRange(allowed)) {
    const s = DAY_ORDER.indexOf(allowed.start);
    const e = DAY_ORDER.indexOf(allowed.end);
    if (s === -1 || e === -1) return null;
    return { type: "range", start: s, end: e };
  }

  return null;
}

export default function Calendar({
  value,
  onChange,
  disabledDates = [],
  allowedDays,
  minDate,
}: Props) {
  const normalized = React.useMemo(() => normalizeAllowed(allowedDays), [allowedDays]);

  const isDayDisabled = (d: Date) => {
    if (!normalized) return false;

    const weekdayIdxMon0 = jsWeekdayToMon0Index(d.getDay());

    if (normalized.type === "list") {
      const allowKey = DAY_ORDER[weekdayIdxMon0];
      return !normalized.set.has(allowKey);
    }

    const { start, end } = normalized;
    if (start <= end) {
      return !(weekdayIdxMon0 >= start && weekdayIdxMon0 <= end);
    }
    return !(weekdayIdxMon0 >= start || weekdayIdxMon0 <= end);
  };

  const handleChange = (newDate: unknown) => {
    if (newDate instanceof Date && !Number.isNaN(newDate.getTime())) {
      onChange(newDate);
    } else {
      onChange(null);
    }
  };

  return (
    <ReactDateRangeCalendar
      date={value ?? undefined}
      onChange={handleChange}
      showDateDisplay={false}
      minDate={minDate ?? new Date()}
      disabledDates={disabledDates}
      disabledDay={isDayDisabled}
    />
  );
}
