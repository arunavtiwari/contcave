import { LuCalendarCheck, LuLayers, LuScrollText, LuUsers } from "react-icons/lu";
import { FaBuilding, FaCameraRetro, FaClipboardList, FaHandshake, FaUserFriends } from "react-icons/fa";

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
    {
        name: "Briefs",
        href: "/admin/dashboard/production",
        icon: FaClipboardList,
    },
    {
        name: "Brands",
        href: "/admin/dashboard/production/brands",
        icon: FaHandshake,
    },
    {
        name: "Crew & Talent",
        href: "/admin/dashboard/production/supply",
        icon: FaUserFriends,
    },
    {
        name: "Shoots",
        href: "/admin/dashboard/production/shoots",
        icon: FaCameraRetro,
    },
] as const;

export function adminEditListingHref(listingId: string) {
    return `/admin/dashboard/listings/${listingId}/edit`;
}
