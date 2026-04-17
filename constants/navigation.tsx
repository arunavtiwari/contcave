import Image from "next/image";
import React from "react";
import { FaCogs, FaHome } from "react-icons/fa";
import { FaCalendar, FaClock } from "react-icons/fa6";

export interface NavigationItem {
    name: string;
    icon: React.ReactNode;
}

export const MAIN_SIDEBAR_ITEMS: NavigationItem[] = [
    {
        name: "Edit Property",
        icon: <FaHome size={22} className="hover:text-primary-foreground sm:hover:text-foreground transition" />
    },
    {
        name: "Sync Calendar",
        icon: <FaCalendar size={22} className="hover:text-primary-foreground sm:hover:text-foreground transition" />
    },
    {
        name: "Manage Timings",
        icon: <FaClock size={22} className="hover:text-primary-foreground sm:hover:text-foreground transition" />
    },
    {
        name: "Manage Blocks",
        icon: <FaCalendar size={22} className="hover:text-primary-foreground sm:hover:text-foreground transition" />
    },
    {
        name: "Settings",
        icon: <FaCogs size={22} className="hover:text-primary-foreground sm:hover:text-foreground transition" />
    },
];

export const PROFILE_SIDEBAR_ITEMS: NavigationItem[] = [
    {
        name: "Profile",
        icon: <Image src="/assets/user.svg" width={22} height={22} alt="Profile" className="object-contain" />,
    },
    {
        name: "Manage Payments",
        icon: <Image src="/assets/faCreditCard-black.svg" width={22} height={22} alt="Payment Details" className="object-contain" />,
    },
    {
        name: "Share & Refer",
        icon: <Image src="/assets/faUserPlus-black.svg" width={22} height={22} alt="Profile Share" className="object-contain" />,
    },
    {
        name: "Settings",
        icon: <Image src="/assets/settings-black.svg" width={22} height={22} alt="Profile Settings" className="object-contain" />,
    },
];
