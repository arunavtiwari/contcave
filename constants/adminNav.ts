import type { IconType } from "react-icons";
import { LuCalendarCheck, LuLayers, LuScrollText, LuUserCog, LuUsers } from "react-icons/lu";

import { can, type Permission } from "@/lib/user/permissions";
import type { UserRole } from "@/types/user";

export const NAV_ITEMS = [
    {
        name: "Listings",
        href: "/admin/dashboard/listings",
        icon: LuLayers,
        permission: "listings.manage",
    },
    {
        name: "Bookings",
        href: "/admin/dashboard/bookings",
        icon: LuCalendarCheck,
        permission: "bookings.view",
    },
    {
        name: "Owners",
        href: "/admin/dashboard/owners",
        icon: LuUsers,
        permission: "owners.manage",
    },
    {
        name: "Users",
        href: "/admin/dashboard/users",
        icon: LuUserCog,
        permission: "users.manage",
    },
    {
        name: "Job Logs",
        href: "/admin/dashboard/logs",
        icon: LuScrollText,
        permission: "logs.view",
    },
] as const satisfies ReadonlyArray<{ name: string; href: string; icon: IconType; permission: Permission }>;

export type NavItem = (typeof NAV_ITEMS)[number];

export const navItemsFor = (role: UserRole) => NAV_ITEMS.filter((item) => can(role, item.permission));

/** The first admin page a staff role can open; "/" for anyone else. */
export const adminHomeFor = (role: UserRole) => navItemsFor(role)[0]?.href ?? "/";

export function adminEditListingHref(listingId: string) {
    return `/admin/dashboard/listings/${listingId}/edit`;
}
