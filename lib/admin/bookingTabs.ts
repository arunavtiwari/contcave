import { can, type Permission } from "@/lib/user/permissions";
import type { UserRole } from "@/types/user";

export const BOOKING_TABS = [
    { key: "bookings", label: "Bookings", permission: "bookings.view" },
    { key: "ownerInvoices", label: "Owner Invoices", permission: "bookings.view" },
    { key: "vouchers", label: "Receipts & Refunds", permission: "bookings.view" },
    { key: "payouts", label: "Payouts", permission: "bookings.view" },
    { key: "failures", label: "Failures", permission: "bookings.manage" },
    { key: "audit", label: "Document Audit", permission: "bookings.manage" },
] as const satisfies ReadonlyArray<{ key: string; label: string; permission: Permission }>;

export type AdminBookingTab = (typeof BOOKING_TABS)[number]["key"];

export const DEFAULT_BOOKING_TAB: AdminBookingTab = "bookings";

export const bookingTabsFor = (role: UserRole) => BOOKING_TABS.filter((tab) => can(role, tab.permission));

/** The requested tab when this role may open it, else the default. */
export function bookingTabFor(role: UserRole, requested: unknown): AdminBookingTab {
    return bookingTabsFor(role).find((tab) => tab.key === requested)?.key ?? DEFAULT_BOOKING_TAB;
}
