"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { FaArrowUpRightDots } from "react-icons/fa6";

import Button from "@/components/ui/Button";
import { MAIN_SIDEBAR_ITEMS, PROFILE_SIDEBAR_ITEMS } from "@/constants/navigation";

interface SidebarProps {
    listingId?: string;
    menuType?: "main" | "profile";
    isOwner?: boolean;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ listingId, menuType = "main", isOwner }) => {
    const pathname = usePathname();

    const itemsToDisplay = React.useMemo(() => {
        return (menuType === "main" ? MAIN_SIDEBAR_ITEMS : PROFILE_SIDEBAR_ITEMS).filter(
            (item) => !item.ownerOnly || isOwner
        );
    }, [menuType, isOwner]);

    return (
        <div className="flex fixed flex-col sm:sticky top-22.5 sm:top-21.25 pr-4 pl-0 py-1.5 sm:py-6 min-w-62.5 bg-foreground/30 sm:bg-background h-fit rounded-full sm:rounded-none backdrop-blur-md z-1">
            <nav>
                <ul className="flex sm:flex-col sm:gap-2 gap-2">
                    {itemsToDisplay.map((item, index) => {
                        const isActive = pathname === item.href;

                        return (
                            <li key={index}>
                                <Link
                                    href={item.href || "#"}
                                    className={`px-4 py-3 flex items-center gap-3 sm:hover:bg-muted rounded-full cursor-pointer group transition-colors ${isActive ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground font-medium"
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="hidden sm:block">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {menuType === "main" && (
                <>
                    <div className="mt-5">
                        <Button
                            label="Check Bookings"
                            href="/dashboard/reservations"
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
