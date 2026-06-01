"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
    const navRef = React.useRef<HTMLElement>(null);
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("tab") || "Edit Property";

    const itemsToDisplay = React.useMemo(() => {
        return (menuType === "main" ? MAIN_SIDEBAR_ITEMS : PROFILE_SIDEBAR_ITEMS).filter(
            (item) => !item.ownerOnly || isOwner
        );
    }, [menuType, isOwner]);

    React.useEffect(() => {
        const activeEl = navRef.current?.querySelector('[aria-current="page"]');
        if (activeEl) {
            activeEl.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center"
            });
        }
    }, [pathname, currentTab]);

    return (
        <aside className="sticky top-20 z-20 -mx-4 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/85 sm:z-auto sm:mx-0 sm:flex sm:h-fit sm:min-w-56 sm:flex-col sm:bg-background sm:px-0 sm:py-6 sm:pr-4 sm:backdrop-blur-none">
            <nav ref={navRef} className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:overflow-visible">
                <ul className="flex min-w-max gap-2 sm:min-w-0 sm:flex-col">
                    {itemsToDisplay.map((item, index) => {
                        let isActive = false;
                        let href = item.href || "#";

                        if (menuType === "main") {
                            isActive = currentTab === item.name;
                            href = `?tab=${encodeURIComponent(item.name)}`;
                        } else {
                            isActive = pathname === item.href;
                        }

                        return (
                            <li key={index}>
                                <Link
                                    href={href}
                                    scroll={false}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`flex h-11 items-center gap-2.5 rounded-full border px-4 text-sm transition-colors sm:h-auto sm:gap-3 sm:border-0 sm:px-4 sm:py-3 sm:hover:bg-muted ${isActive ? "border-foreground bg-foreground text-background shadow-sm sm:border-0 sm:bg-muted sm:text-foreground sm:shadow-none sm:font-semibold" : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground sm:bg-transparent sm:font-medium"
                                        }`}
                                >
                                    <span className="shrink-0 text-base sm:text-inherit">{item.icon}</span>
                                    <span className="whitespace-nowrap">{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {menuType === "main" && (
                <>
                    <div className="mt-5 hidden sm:block">
                        <Button
                            label="Check Bookings"
                            href="/dashboard/reservations"
                            variant="default"
                            rounded
                            icon={FaArrowUpRightDots}
                        />
                    </div>

                    {listingId && (
                        <div className="mt-5 hidden sm:block">
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
        </aside>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
