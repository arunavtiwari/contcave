import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { HiOutlineLogout } from "react-icons/hi";

import { logoutAdmin } from "@/app/actions/logoutAdmin";
import { NAV_ITEMS } from "@/constants/adminNav";

const AdminSidebar: React.FC = React.memo(() => {
    const pathname = usePathname();

    const handleLogout = async () => {
        await logoutAdmin();
    };

    return (
        <div className="w-64 h-screen bg-neutral-950 flex flex-col border-r border-neutral-800 shrink-0 sticky top-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-8">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <Image
                        src="/assets/logo.png"
                        alt="Contcave Logo"
                        width={120}
                        height={40}
                        className="h-8 w-auto brightness-0 invert"
                    />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 overflow-y-auto">
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
                                            ? "bg-neutral-100 text-black"
                                            : "text-neutral-400 hover:bg-neutral-50 hover:text-black"
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:bg-white/5 hover:text-white transition-all cursor-pointer"
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
