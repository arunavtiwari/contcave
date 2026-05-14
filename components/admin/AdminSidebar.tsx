"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { FiShield } from "react-icons/fi";
import { HiOutlineLogout } from "react-icons/hi";

import { logoutAdmin } from "@/app/actions/logoutAdmin";
import { NAV_ITEMS } from "@/constants/adminNav";

const AdminSidebar: React.FC = React.memo(() => {
    const pathname = usePathname();

    const handleLogout = async () => {
        await logoutAdmin();
    };

    return (
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col overflow-hidden border-r border-border bg-background">
            {/* Header */}
            <div className="border-b border-border px-5 py-6">
                <Link href="/admin/dashboard/listings" className="flex items-center gap-3 rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20">
                    <Image
                        src="/assets/logo.png"
                        alt="Contcave Logo"
                        width={120}
                        height={40}
                        className="h-8 w-auto"
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20
                                        ${isActive
                                            ? "bg-neutral-50 text-foreground ring-1 ring-border font-semibold"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }
                                    `}
                                >
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-colors ${isActive
                                        ? "border-border bg-background text-foreground"
                                        : "border-border bg-background text-muted-foreground"
                                        }`}
                                    >
                                        <Icon size={18} />
                                    </span>
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer: Logout */}
            <div className="border-t border-border px-3 py-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground">
                        <HiOutlineLogout size={18} />
                    </span>
                    <span className="hidden sm:block">Logout</span>
                </button>
            </div>
        </aside>
    );
});

AdminSidebar.displayName = "AdminSidebar";

export default AdminSidebar;
