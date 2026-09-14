"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { LuLogOut } from "react-icons/lu";

import { logoutAdmin } from "@/app/actions/logoutAdmin";
import { NAV_ITEMS } from "@/constants/adminNav";
import { cn } from "@/lib/utils";

const AdminSidebar: React.FC = React.memo(() => {
    const pathname = usePathname();

    const handleLogout = async () => {
        await logoutAdmin();
    };

    return (
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-white select-none">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b border-border/80 px-4">
                <Link
                    href="/admin/dashboard/listings"
                    className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    <Image
                        src="/assets/logo.png"
                        alt="Contcave Logo"
                        width={100}
                        height={30}
                        priority
                        className="h-6 w-auto object-contain"
                    />
                </Link>
                <span className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Admin
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
                <div>
                    <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        Platform
                    </div>
                    <ul className="space-y-1">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                                            isActive
                                                ? "bg-muted text-foreground font-semibold"
                                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                "size-4.5 shrink-0 transition-colors",
                                                isActive
                                                    ? "text-foreground"
                                                    : "text-muted-foreground group-hover:text-foreground"
                                            )}
                                        />
                                        <span>{item.name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            {/* Footer: Logout */}
            <div className="border-t border-border/80 p-3">
                <button
                    type="button"
                    onClick={handleLogout}
                    className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring active:scale-100! active:transform-none!"
                >
                    <LuLogOut className="size-4.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
});

AdminSidebar.displayName = "AdminSidebar";

export default AdminSidebar;
