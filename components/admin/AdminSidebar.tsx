"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { FaClock } from "react-icons/fa";
import { HiOutlineLogout, HiOutlineShieldCheck } from "react-icons/hi";

import { signOut } from "@/auth";

const NAV_ITEMS = [
    {
        name: "Listings",
        href: "/dashboard/listings",
        icon: FaClock,
    },
] as const;

const AdminSidebar: React.FC = React.memo(() => {
    const pathname = usePathname();

    return (
        <div className="flex flex-col sm:sticky top-0 sm:top-0 min-w-62.5 bg-gray-950 text-white h-screen">
            {/* Logo / Brand */}
            <div className="px-6 py-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                        <HiOutlineShieldCheck size={20} className="text-emerald-400" />
                    </div>
                    <div className="hidden sm:block">
                        <div className="text-sm font-bold tracking-tight">Contcave</div>
                        <div className="text-[11px] text-gray-400 font-medium uppercase tracking-widest">Admin</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4">
                <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold px-3 mb-3 hidden sm:block">
                    Management
                </div>
                <ul className="flex sm:flex-col gap-1">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <Link key={item.href} href={item.href}>
                                <li
                                    className={`px-3 py-2.5 flex items-center gap-3 rounded-lg cursor-pointer transition-all text-sm font-medium ${isActive
                                        ? "bg-white/10 text-white"
                                        : "text-gray-400 hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span className="hidden sm:block">{item.name}</span>
                                </li>
                            </Link>
                        );
                    })}
                </ul>
            </nav>

            {/* Footer: Logout */}
            <div className="px-3 py-4 border-t border-white/10">
                <form
                    action={async () => {
                        "use server";
                        await signOut({ redirectTo: "/" });
                    }}
                >
                    <button
                        type="submit"
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
                    >
                        <HiOutlineLogout size={18} />
                        <span className="hidden sm:block">Logout</span>
                    </button>
                </form>
            </div>
        </div>
    );
});

AdminSidebar.displayName = "AdminSidebar";

export default AdminSidebar;
