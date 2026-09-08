import { formatInTimeZone } from "date-fns-tz";

/**
 * Combines a reservation date with a stored 12-hour or 24-hour time label.
 * Reservation times are interpreted in India Standard Time.
 */
export function parseReservationTimeForDate(date: Date, label: string): Date | null {
  const dateKey = date.toISOString().slice(0, 10);
  const value = String(label || "").trim();
  const twelveHour = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const twentyFourHour = value.match(/^(\d{1,2}):(\d{2})$/);

  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    const period = twelveHour[3].toUpperCase();
    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
    return new Date(
      `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`
    );
  }

  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return new Date(
      `${dateKey}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:30`
    );
  }

  return null;
}

export function parseReservationEndTimeForDate(date: Date, label: string): Date | null {
  const parsed = parseReservationTimeForDate(date, label);
  if (!parsed) return null;

  const value = String(label || "").trim();
  if (/^(?:12:00\s*AM|00:00)$/i.test(value)) {
    return new Date(parsed.getTime() + 24 * 60 * 60 * 1000);
  }
  return parsed;
}

export function formatReservationDate(date: Date, pattern = "dd MMM yyyy") {
  return formatInTimeZone(date, "UTC", pattern);
}
