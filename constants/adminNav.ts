import { FaBuilding, FaCalendarCheck, FaClipboardList } from "react-icons/fa";

export const NAV_ITEMS = [
    {
        name: "Listings",
        href: "/admin/dashboard/listings",
        icon: FaBuilding,
    },
    {
        name: "Bookings",
        href: "/admin/dashboard/bookings",
        icon: FaCalendarCheck,
    },
    {
        name: "Job Logs",
        href: "/admin/dashboard/logs",
        icon: FaClipboardList,
    },
] as const;

