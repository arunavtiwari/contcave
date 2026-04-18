import React from "react";
import {
    FaCalendarDays,
    FaClock,
    FaCreditCard,
    FaGear,
    FaHouse,
    FaUser,
    FaUserPlus
} from "react-icons/fa6";

export interface NavigationItem {
    name: string;
    icon: React.ReactNode;
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
    },
    {
        name: "Manage Payments",
        icon: <FaCreditCard size={20} />,
    },
    {
        name: "Share & Refer",
        icon: <FaUserPlus size={20} />,
    },
    {
        name: "Settings",
        icon: <FaGear size={20} />,
    },
];

