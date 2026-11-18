import { describe, expect, it } from "vitest";

import { roleAfter, roleChangeError, userRoleTabOf } from "@/lib/admin/userRoles";
import { usersHref } from "@/lib/admin/usersHref";
import { containsText, escapeRegex } from "@/lib/db/textSearch";
import { changeUserRoleSchema, inviteStaffSchema } from "@/schemas/adminUsers";
import { UserRole } from "@/types/user";

const check = (overrides: Partial<Parameters<typeof roleChangeError>[0]> = {}) =>
    roleChangeError({
        actorId: "admin-1",
        target: { id: "user-1", role: UserRole.CUSTOMER },
        change: "FINANCE",
        ownsListings: false,
        adminCount: 2,
        ...overrides,
    });

describe("roleAfter", () => {
    it("grants the staff role asked for", () => {
        expect(roleAfter("FINANCE", false)).toBe(UserRole.FINANCE);
        expect(roleAfter("ADMIN", true)).toBe(UserRole.ADMIN);
    });

    it("returns studio owners to owner and everyone else to customer", () => {
        expect(roleAfter("revoke", true)).toBe(UserRole.OWNER);
        expect(roleAfter("revoke", false)).toBe(UserRole.CUSTOMER);
    });
});

describe("roleChangeError", () => {
    it("allows a normal grant", () => {
        expect(check()).toBeNull();
    });

    it("stops admins changing their own role", () => {
        expect(check({ target: { id: "admin-1", role: UserRole.ADMIN }, change: "revoke" })).toMatch(/your own role/);
    });

    it("keeps at least one admin", () => {
        expect(check({ target: { id: "admin-2", role: UserRole.ADMIN }, change: "revoke", adminCount: 1 })).toMatch(/at least one admin/);
        expect(check({ target: { id: "admin-2", role: UserRole.ADMIN }, change: "FINANCE", adminCount: 1 })).toMatch(/at least one admin/);
        expect(check({ target: { id: "admin-2", role: UserRole.ADMIN }, change: "revoke", adminCount: 2 })).toBeNull();
    });

    it("refuses to turn a studio owner into finance", () => {
        expect(check({ target: { id: "user-1", role: UserRole.OWNER }, ownsListings: true })).toMatch(/owns studios/);
        expect(check({ target: { id: "user-1", role: UserRole.OWNER }, ownsListings: true, change: "ADMIN" })).toBeNull();
    });

    it("rejects a change that does nothing", () => {
        expect(check({ target: { id: "user-1", role: UserRole.FINANCE } })).toMatch(/already finance/);
        expect(check({ target: { id: "user-1", role: UserRole.CUSTOMER }, change: "revoke" })).toMatch(/already customer/);
    });
});

describe("users page URLs", () => {
    it("keeps only the parts that differ from the defaults", () => {
        expect(usersHref({ tab: "all" })).toBe("/admin/dashboard/users");
        expect(usersHref({ tab: "FINANCE", page: 2, q: " priya " })).toBe("/admin/dashboard/users?tab=FINANCE&page=2&q=priya");
    });

    it("reads unknown tabs as all", () => {
        expect(userRoleTabOf("FINANCE")).toBe("FINANCE");
        expect(userRoleTabOf("ROOT")).toBe("all");
    });
});

describe("admin user inputs", () => {
    it("normalises invite emails and only accepts staff roles", () => {
        expect(inviteStaffSchema.parse({ name: "Priya", email: " Priya@Example.COM ", role: "FINANCE" }).email).toBe("priya@example.com");
        expect(inviteStaffSchema.safeParse({ name: "Priya", email: "priya@example.com", role: "OWNER" }).success).toBe(false);
        expect(inviteStaffSchema.safeParse({ name: "P", email: "not-an-email", role: "ADMIN" }).success).toBe(false);
    });

    it("validates role changes", () => {
        expect(changeUserRoleSchema.safeParse({ userId: "a".repeat(24), change: "revoke" }).success).toBe(true);
        expect(changeUserRoleSchema.safeParse({ userId: "nope", change: "ADMIN" }).success).toBe(false);
        expect(changeUserRoleSchema.safeParse({ userId: "a".repeat(24), change: "CUSTOMER" }).success).toBe(false);
    });
});

describe("containsText", () => {
    it("matches search terms literally, including plus-addressed emails", () => {
        const { contains, mode } = containsText("name+tag@gmail.com");
        expect(mode).toBe("insensitive");
        expect(new RegExp(contains, "i").test("NAME+TAG@gmail.com")).toBe(true);
        expect(new RegExp(contains, "i").test("nameetag@gmail.com")).toBe(false);
        expect(escapeRegex("a.b*(c)")).toBe(String.raw`a\.b\*\(c\)`);
    });
});
