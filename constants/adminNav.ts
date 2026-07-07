import { FaBuilding, FaCalendarCheck } from "react-icons/fa";

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
] as const;

