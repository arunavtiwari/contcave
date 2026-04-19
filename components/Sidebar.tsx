"use client";

import React from "react";
import { FaArrowUpRightDots } from "react-icons/fa6";

import Button from "@/components/ui/Button";
import { MAIN_SIDEBAR_ITEMS, NavigationItem, PROFILE_SIDEBAR_ITEMS } from "@/constants/navigation";

interface SidebarProps {
    selectedMenu: string;
    setSelectedMenu: (menu: string) => void;
    listingId?: string;
    menuType?: "main" | "profile";
    isOwner?: boolean;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ selectedMenu, setSelectedMenu, listingId, menuType = "main", isOwner }) => {

    const itemsToDisplay = React.useMemo(() => {
        let items = menuType === "profile" ? PROFILE_SIDEBAR_ITEMS : MAIN_SIDEBAR_ITEMS;
        if (isOwner === false) {
            items = items.filter(item => item.name !== "Manage Payments");
        }
        return items;
    }, [menuType, isOwner]);

    const handleMenuClick = React.useCallback((item: NavigationItem) => {
        setSelectedMenu(item.name);
    }, [setSelectedMenu]);

    return (
        <div className="flex fixed flex-col sm:sticky top-22.5 sm:top-21.25 pr-4 pl-0 py-1.5 sm:py-10 min-w-62.5 bg-foreground/30 sm:bg-background h-fit rounded-full sm:rounded-none backdrop-blur-md z-1">
            <nav>
                <ul className="flex sm:flex-col sm:gap-2 gap-2">
                    {itemsToDisplay.map((item, index) => (
                        <li
                            key={index}
                            className={`px-4 py-3 flex items-center gap-3 sm:hover:bg-muted rounded-full cursor-pointer group ${selectedMenu === item.name ? "bg-muted" : ""
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
                        <Button
                            label="Check Bookings"
                            href="/reservations"
                            variant="default"
                            rounded
                            icon={FaArrowUpRightDots}
                        />
                    </div>

                    {listingId && (
                        <div className="mt-5">
                            <Button
                                label="Preview"
                                href={`/listings/${listingId}`}
                                target="_blank"
                                variant="outline"
                                rounded
                                icon={FaArrowUpRightDots}
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
