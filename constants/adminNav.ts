import { LuCalendarCheck, LuLayers, LuScrollText } from "react-icons/lu";

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
        name: "Job Logs",
        href: "/admin/dashboard/logs",
        icon: LuScrollText,
    },
] as const;
