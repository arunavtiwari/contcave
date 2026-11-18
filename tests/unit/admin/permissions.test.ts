import { describe, expect, it } from "vitest";

import { adminHomeFor, navItemsFor } from "@/constants/adminNav";
import { bookingTabFor, bookingTabsFor } from "@/lib/admin/bookingTabs";
import { canReadBookingDocument } from "@/lib/storage/privatePdfResponse";
import { can, isStaff, type Permission, rolesWith } from "@/lib/user/permissions";
import { UserRole } from "@/types/user";

const ALL: Permission[] = [
    "listings.manage",
    "bookings.view",
    "bookings.manage",
    "documents.view",
    "owners.manage",
    "logs.view",
    "users.manage",
];

describe("can", () => {
    it("gives admins every permission", () => {
        for (const permission of ALL) expect(can(UserRole.ADMIN, permission), permission).toBe(true);
    });

    it("gives finance read access to bookings and documents only", () => {
        expect(ALL.filter((permission) => can(UserRole.FINANCE, permission))).toEqual(["bookings.view", "documents.view"]);
    });

    it("gives customers, owners and signed-out visitors nothing", () => {
        for (const role of [UserRole.CUSTOMER, UserRole.OWNER, null, undefined]) {
            for (const permission of ALL) expect(can(role, permission), `${role} ${permission}`).toBe(false);
        }
    });

    it("lists the roles allowed to run an action", () => {
        expect(rolesWith("bookings.view")).toEqual([UserRole.ADMIN, UserRole.FINANCE]);
        expect(rolesWith("bookings.manage")).toEqual([UserRole.ADMIN]);
        expect(rolesWith("users.manage")).toEqual([UserRole.ADMIN]);
    });

    it("treats only admins and finance as staff", () => {
        expect([UserRole.ADMIN, UserRole.FINANCE, UserRole.OWNER, UserRole.CUSTOMER].map(isStaff)).toEqual([true, true, false, false]);
    });
});

describe("admin navigation", () => {
    it("shows finance only the bookings page and lands them there", () => {
        expect(navItemsFor(UserRole.FINANCE).map((item) => item.name)).toEqual(["Bookings"]);
        expect(adminHomeFor(UserRole.FINANCE)).toBe("/admin/dashboard/bookings");
    });

    it("shows admins every page, including users", () => {
        expect(navItemsFor(UserRole.ADMIN).map((item) => item.name)).toEqual(["Listings", "Bookings", "Owners", "Users", "Job Logs"]);
        expect(adminHomeFor(UserRole.ADMIN)).toBe("/admin/dashboard/listings");
    });

    it("sends everyone else home", () => {
        expect(adminHomeFor(UserRole.CUSTOMER)).toBe("/");
    });
});

describe("booking tabs", () => {
    it("hides failures and the document audit from finance", () => {
        expect(bookingTabsFor(UserRole.FINANCE).map((tab) => tab.key)).toEqual(["bookings", "ownerInvoices", "vouchers", "payouts"]);
        expect(bookingTabFor(UserRole.FINANCE, "audit")).toBe("bookings");
        expect(bookingTabFor(UserRole.FINANCE, "ownerInvoices")).toBe("ownerInvoices");
    });

    it("gives admins every tab", () => {
        expect(bookingTabFor(UserRole.ADMIN, "audit")).toBe("audit");
        expect(bookingTabFor(UserRole.ADMIN, "nonsense")).toBe("bookings");
    });
});

describe("canReadBookingDocument", () => {
    const document = { userId: "guest", reservation: { userId: "guest", listing: { userId: "host" } } };

    it("lets finance, admins, the guest and the host read", () => {
        expect(canReadBookingDocument({ id: "f", role: UserRole.FINANCE }, document)).toBe(true);
        expect(canReadBookingDocument({ id: "a", role: UserRole.ADMIN }, document)).toBe(true);
        expect(canReadBookingDocument({ id: "guest", role: UserRole.CUSTOMER }, document)).toBe(true);
        expect(canReadBookingDocument({ id: "host", role: UserRole.OWNER }, document)).toBe(true);
    });

    it("refuses other users and missing documents", () => {
        expect(canReadBookingDocument({ id: "other", role: UserRole.OWNER }, document)).toBe(false);
        expect(canReadBookingDocument({ id: "f", role: UserRole.FINANCE }, null)).toBe(false);
    });
});
