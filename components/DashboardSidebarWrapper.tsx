"use client";

import { usePathname } from "next/navigation";
import React from "react";

import Sidebar from "@/components/Sidebar";

export default function DashboardSidebarWrapper({
    children,
    isOwner,
}: {
    children: React.ReactNode;
    isOwner: boolean;
}) {
    const pathname = usePathname();

    let showSidebar = false;
    let menuType: "profile" | "main" = "profile";
    let listingId: string | undefined = undefined;

    const profilePaths = [
        "/dashboard/profile",
        "/dashboard/payments",
        "/dashboard/referral",
        "/dashboard/settings",
    ];

    if (profilePaths.includes(pathname)) {
        showSidebar = true;
        menuType = "profile";
    } else if (
        pathname.startsWith("/dashboard/properties/") &&
        pathname !== "/dashboard/properties"
    ) {
        showSidebar = true;
        menuType = "main";
        // Extract listingId from pathname
        const pathParts = pathname.split("/");
        listingId = pathParts[pathParts.length - 1];
    }

    return (
        <div className="flex-1 w-full max-w-360 mx-auto flex flex-col sm:flex-row px-4 sm:px-8">
            {showSidebar && (
                <React.Suspense fallback={<div className="min-w-56" />}>
                    <Sidebar
                        menuType={menuType}
                        isOwner={isOwner}
                        listingId={listingId}
                    />
                </React.Suspense>
            )}
            <div
                className={`flex min-w-0 flex-col flex-1 w-full gap-8 border-border overflow-hidden ${
                    showSidebar ? "pt-0 pb-6 sm:pl-6 sm:pt-8 sm:border-l" : "py-5 sm:py-8"
                }`}
            >
                {children}
            </div>
        </div>
    );
}
