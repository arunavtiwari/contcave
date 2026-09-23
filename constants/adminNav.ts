import { LuCalendarCheck, LuLayers, LuScrollText, LuUsers } from "react-icons/lu";

export const NAV_ITEMS = [
    {
        name: "Listings",
        href: "/admin/dashboard/listings",
        icon: LuLayers,
    },
    {
        name: "Bookings",
        href: "/admin/dashboard/bookings",
        icon: LuCalendarCheck,
    },
    {
        name: "Owners",
        href: "/admin/dashboard/owners",
        icon: LuUsers,
    },
    {
        name: "Job Logs",
        href: "/admin/dashboard/logs",
        icon: LuScrollText,
    },
] as const;

export function adminEditListingHref(listingId: string) {
    return `/admin/dashboard/listings/${listingId}/edit`;
}
