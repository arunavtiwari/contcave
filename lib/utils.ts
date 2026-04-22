import { type ClassValue, clsx } from "clsx";
import * as crypto from "crypto";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Generates a collision-resistant, human-readable 8-character Enterprise Booking ID.
 * Excludes confusing characters like 0, O, 1, and I for premium user experience.
 */
export function generateBookingId(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return "BKG-" + result;
}

/**
 * Returns the base URL of the application.
 */
export function getBaseUrl(): string {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
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

/**
 * Parses a string input to a safe integer, removing all non-digit characters.
 * Useful for standardized numeric inputs (carpetArea, price, etc.)
 */
export function parseNumericInput(value: string, defaultValue = 0): number {
    const onlyDigits = value.replace(/\D/g, "");
    const val = parseInt(onlyDigits, 10);
    return isNaN(val) ? defaultValue : val;
}
