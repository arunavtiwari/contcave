import { asEndOfDayMinutes, labelToMinutes } from "@/lib/scheduling";

const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const CONFIGURED_DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function getBookingDate(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}

function validDateKey(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = getBookingDate(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function getBookingDayKey(date: string) {
  return DAY_KEYS[new Date(`${date}T12:00:00+05:30`).getUTCDay()];
}

function isOperationalDay(operationalDays: unknown, date: string) {
  const day = getBookingDayKey(date);
  if (!operationalDays || typeof operationalDays !== "object" || Array.isArray(operationalDays)) return true;
  const days = operationalDays as { days?: unknown[]; start?: unknown; end?: unknown };

  if (Array.isArray(days.days)) return days.days.map(String).includes(day);

  const start = typeof days.start === "string" ? days.start : "Mon";
  const end = typeof days.end === "string" ? days.end : "Sun";
  const startIndex = CONFIGURED_DAY_ORDER.indexOf(start);
  const endIndex = CONFIGURED_DAY_ORDER.indexOf(end);
  const currentIndex = CONFIGURED_DAY_ORDER.indexOf(day);
  if (startIndex < 0 || endIndex < 0 || currentIndex < 0) return true;
  if (startIndex <= endIndex) return currentIndex >= startIndex && currentIndex <= endIndex;
  return currentIndex >= startIndex || currentIndex <= endIndex;
}

export function validateBookingWindow(params: {
  startDate: string;
  startTime: string;
  endTime: string;
  operationalDays: unknown;
  operationalHours: unknown;
  minimumBookingHours?: number | null;
  selectedPackageDurationHours?: number | null;
}) {
  if (!validDateKey(params.startDate)) return "Please choose a valid booking date.";

  const startMin = labelToMinutes(params.startTime);
  const endMin = asEndOfDayMinutes(labelToMinutes(params.endTime));
  if (!Number.isFinite(startMin) || !Number.isFinite(endMin)) return "Please choose a valid start and end time.";
  if (endMin <= startMin) return "End time must be after start time.";

  const durationMinutes = endMin - startMin;
  const configuredMinimumMinutes = Math.max(0, Number(params.minimumBookingHours || 0)) * 60;
  const minimumMinutes = configuredMinimumMinutes > 0 ? configuredMinimumMinutes : 90;
  if (durationMinutes < minimumMinutes) {
    const minimumHours = minimumMinutes / 60;
    return `Minimum booking duration is ${minimumHours} hour${minimumHours === 1 ? "" : "s"}.`;
  }

  const packageMinutes = Math.max(0, Number(params.selectedPackageDurationHours || 0)) * 60;
  if (packageMinutes > 0 && durationMinutes !== packageMinutes) return "Selected time slot must match the package duration.";
  if (!isOperationalDay(params.operationalDays, params.startDate)) {
    return "This studio is not operational on the selected date.";
  }

  if (params.operationalHours && typeof params.operationalHours === "object" && !Array.isArray(params.operationalHours)) {
    const hours = params.operationalHours as { start?: unknown; end?: unknown };
    const openMin = labelToMinutes(typeof hours.start === "string" ? hours.start : "");
    const rawCloseMin = labelToMinutes(typeof hours.end === "string" ? hours.end : "");
    const closeMin = asEndOfDayMinutes(rawCloseMin);
    const isAlwaysOpen = openMin === 0 && rawCloseMin === 0;
    if (!isAlwaysOpen && Number.isFinite(openMin) && Number.isFinite(closeMin)) {
      if (closeMin <= openMin) return "This studio's operational hours are not configured correctly.";
      if (startMin < openMin || endMin > closeMin) {
        return "Selected time slot is outside this studio's operational hours.";
      }
    }
  }

  const slotStart = new Date(
    `${params.startDate}T${String(Math.floor(startMin / 60)).padStart(2, "0")}:${String(startMin % 60).padStart(2, "0")}:00+05:30`,
  );
  if (slotStart.getTime() <= Date.now()) return "Past time slots are not available for booking.";
  return null;
}
