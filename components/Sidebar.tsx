"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { FaCogs, FaHome } from "react-icons/fa";
import { FaArrowUpRightDots, FaCalendar, FaClock } from "react-icons/fa6";

interface SidebarProps {
    selectedMenu: string;
    setSelectedMenu: (menu: string) => void;
    listingId?: string;
    menuType?: "main" | "profile";
    isOwner?: boolean;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ selectedMenu, setSelectedMenu, listingId, menuType = "main", isOwner }) => {


    const sidebarMenuItems = React.useMemo(() => [
        { name: "Edit Property", icon: <FaHome size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Sync Calendar", icon: <FaCalendar size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Manage Timings", icon: <FaClock size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Manage Blocks", icon: <FaCalendar size={22} className="hover:text-white sm:hover:text-black transition" /> },
        { name: "Settings", icon: <FaCogs size={22} className="hover:text-white sm:hover:text-black transition" /> },
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
    ], []);

    const itemsToDisplay = React.useMemo(() => {
        let items = menuType === "profile" ? sidebarMenuItems.slice(5) : sidebarMenuItems.slice(0, 5);
        if (isOwner === false) {
            items = items.filter(item => item.name !== "Manage Payments");
        }
        return items;
    }, [sidebarMenuItems, menuType, isOwner]);

    const handleMenuClick = React.useCallback((item: typeof sidebarMenuItems[0]) => {
        setSelectedMenu(item.name);
    }, [setSelectedMenu]);

    return (
        <div className="flex fixed flex-col sm:sticky top-22.5 sm:top-21.25 pr-4 pl-0 py-1.5 sm:py-10 min-w-62.5 bg-black/30 sm:bg-white h-fit rounded-full sm:rounded-none backdrop-blur-md z-1">
            <nav>
                <ul className="flex sm:flex-col sm:gap-2 gap-2">
                    {itemsToDisplay.map((item, index) => (
                        <li
                            key={index}
                            className={`px-4 py-3 flex items-center gap-3 sm:hover:bg-gray-50 rounded-full cursor-pointer group ${selectedMenu === item.name ? "bg-gray-100" : ""
                                }`}
                            onClick={() => handleMenuClick(item)}
                        >
                            <span>{item.icon}</span>
                            <span className="hidden sm:block">{item.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>

            {menuType === "main" && (
                <>
                    <div className="mt-5">
                        <Link
                            href="/reservations"
                            className="px-4 py-2.5 gap-3 flex items-center bg-black text-white hover:opacity-90 rounded-full cursor-pointer group justify-center"
                        >
                            <span>
                                <FaArrowUpRightDots size={22} />
                            </span>
                            <span>Check Bookings</span>
                        </Link>
                    </div>

                    {listingId && (
                        <div className="mt-5">
                            <Link
                                href={`/listings/${listingId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 gap-3 flex items-center border border-black rounded-full cursor-pointer group justify-center"
                            >
                                <span>
                                    <FaArrowUpRightDots size={22} />
                                </span>
                                <span>Preview</span>
                            </Link>
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;