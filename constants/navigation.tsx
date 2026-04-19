import {
    FaCalendarDays,
    FaClock,
    FaCreditCard,
    FaGear,
    FaHouse,
    FaTicket,
    FaUser,
    FaUserPlus
} from "react-icons/fa6";

export interface NavigationItem {
    name: string;
    icon: React.ReactNode;
    href?: string;
    ownerOnly?: boolean;
}

export const MAIN_SIDEBAR_ITEMS: NavigationItem[] = [
    {
        name: "Edit Property",
        icon: <FaHouse size={20} />
    },
    {
        name: "Sync Calendar",
        icon: <FaCalendarDays size={20} />
    },
    {
        name: "Manage Timings",
        icon: <FaClock size={20} />
    },
    {
        name: "Manage Blocks",
        icon: <FaCalendarDays size={20} />
    },
    {
        name: "Settings",
        icon: <FaGear size={20} />
    },
];

export const PROFILE_SIDEBAR_ITEMS: NavigationItem[] = [
    {
        name: "Profile",
        icon: <FaUser size={20} />,
        href: "/dashboard/profile"
    },
    {
        name: "My Bookings",
        icon: <FaTicket size={20} />,
        href: "/dashboard/bookings"
    },
    {
        name: "My Properties",
        icon: <FaHouse size={20} />,
        href: "/dashboard/properties",
        ownerOnly: true
    },
    {
        name: "Guest Reservations",
        icon: <FaCalendarDays size={20} />,
        href: "/dashboard/reservations",
        ownerOnly: true
    },
    {
        name: "Manage Payments",
        icon: <FaCreditCard size={20} />,
        href: "/dashboard/payments",
        ownerOnly: true
    },
    {
        name: "Share & Refer",
        icon: <FaUserPlus size={20} />,
        href: "/dashboard/referral"
    },
    {
        name: "Settings",
        icon: <FaGear size={20} />,
        href: "/dashboard/settings"
    },
];

