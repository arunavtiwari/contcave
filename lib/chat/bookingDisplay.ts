import {
  calculateDurationInHours,
  formatBookingDateValue,
  formatDisplayTime,
} from "@/lib/chat/displayUtils";
import type { ChatBooking, SelectedAddon } from "@/lib/chat/types";

export function formatTimeString(timeStr: string): string {
  return timeStr ? formatDisplayTime(timeStr) : "";
}

export function formatBookingDate(dateStr: string | undefined) {
  return formatBookingDateValue(dateStr);
}

export function calculateDurationHours(startTimeStr: string, endTimeStr: string): number {
  return calculateDurationInHours(startTimeStr, endTimeStr);
}

export function normalizeAddons(value: ChatBooking["selectedAddons"]): SelectedAddon[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const candidate = item as Partial<SelectedAddon>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const qty = typeof candidate.qty === "number" && Number.isFinite(candidate.qty) ? candidate.qty : 0;
    const price = typeof candidate.price === "number" && Number.isFinite(candidate.price) ? candidate.price : 0;

    if (!name || qty <= 0 || price < 0) {
      return [];
    }

    return [{ name, qty, price }];
  });
}
