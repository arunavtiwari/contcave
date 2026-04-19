import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Formats a date using en-IN locale and Asia/Kolkata timezone.
 */
export function formatISTDate(
    date: Date | string | number | undefined | null,
    options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
    }
): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        ...options,
    });
}

/**
 * Formats a date/time using en-IN locale and Asia/Kolkata timezone.
 */
export function formatISTDateTime(
    date: Date | string | number | undefined | null,
    options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }
): string {
    if (!date) return "—";
    return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        ...options,
    });
}

/**
 * Formats a number as Indian Rupees (INR) using en-IN locale.
 */
export function formatINR(amount: number): string {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Formats a time using en-IN locale and Asia/Kolkata timezone.
 */
export function formatISTTime(
    date: Date | string | number | undefined | null,
    options: Intl.DateTimeFormatOptions = {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    }
): string {
    if (!date) return "—";
    return new Date(date).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        ...options,
    });
}
