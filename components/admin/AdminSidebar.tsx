"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { FaClock } from "react-icons/fa";
import { HiOutlineLogout } from "react-icons/hi";

import { logoutAdmin } from "@/app/actions/logoutAdmin";

const NAV_ITEMS = [
    {
        name: "Listings",
        href: "/dashboard/listings",
        icon: FaClock,
    },
] as const;

const AdminSidebar: React.FC = React.memo(() => {
    const pathname = usePathname();

    const handleLogout = async () => {
        await logoutAdmin();
    };

    return (
        <div className="w-64 h-screen bg-gray-950 flex flex-col border-r border-white/10 shrink-0 sticky top-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-8">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl">
                        C
                    </div>
                    <span className="text-xl font-bold text-white tracking-tight">
                        Admin
                    </span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 overflow-y-auto">
                <div className="mb-4 px-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                    Management
                </div>
                <ul className="space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;

                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                        ${isActive
                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                            : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        }
                                    `}
                                >
                                    <Icon size={18} />
                                    <span>{item.name}</span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer: Logout */}
            <div className="px-3 py-4 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                >
                    <HiOutlineLogout size={18} />
                    <span className="hidden sm:block">Logout</span>
                </button>
            </div>
        </div>
    );
});

AdminSidebar.displayName = "AdminSidebar";

export default AdminSidebar;
