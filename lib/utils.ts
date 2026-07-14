import { type ClassValue, clsx } from "clsx";
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
    const randomBytes = globalThis.crypto.getRandomValues(new Uint8Array(8));
    const result = Array.from(randomBytes, (byte) => chars.charAt(byte % chars.length)).join("");
    return "BKG-" + result;
}

/**
 * Returns the base URL of the application.
 */
export function getBaseUrl(): string {
    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    if (process.env.APP_URL) {
        return process.env.APP_URL.replace(/\/$/, "");
    }

    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
    }

    // Keep the application URL aligned with the URL variables understood by
    // Auth.js/legacy NextAuth deployments when APP_URL is not set explicitly.
    if (process.env.AUTH_URL) {
        return process.env.AUTH_URL.replace(/\/$/, "");
    }

    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL.replace(/\/$/, "");
    }

    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}

export function getValidatedBaseUrl(): string {
    let parsed: URL;
    try {
        parsed = new URL(getBaseUrl());
    } catch {
        throw new Error("Application URL is not configured correctly");
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Application URL must use HTTP or HTTPS");
    }
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
        throw new Error("Application URL must use HTTPS in production");
    }

    return parsed.origin;
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
