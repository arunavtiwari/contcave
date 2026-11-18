"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LuLogOut, LuMenu } from "react-icons/lu";

import { logoutAdmin } from "@/app/actions/logoutAdmin";
import Button from "@/components/ui/Button";
import Sheet, { SheetTitle } from "@/components/ui/Sheet";
import { adminHomeFor, navItemsFor } from "@/constants/adminNav";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/user";

const itemClass =
    "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-colors focus-visible:border-foreground focus-visible:outline-none";

function Brand({ role }: { role: UserRole }) {
    return (
        <>
            <Link
                href={adminHomeFor(role)}
                className="flex items-center gap-2 rounded-lg border border-transparent transition-opacity hover:opacity-90 focus-visible:border-foreground focus-visible:outline-none"
            >
                <Image src="/assets/logo.png" alt="Contcave Logo" width={100} height={30} priority className="h-6 w-auto object-contain" />
            </Link>
            <span className="rounded-md border border-border/60 bg-muted/60 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {role === "FINANCE" ? "Finance" : "Admin"}
            </span>
        </>
    );
}

function SidebarNav({ role }: { role: UserRole }) {
    const pathname = usePathname();
    return (
        <>
            <nav aria-label="Admin" className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
                <div>
                    <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">Platform</div>
                    <ul className="space-y-1">
                        {navItemsFor(role).map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.name}>
                                    <Link
                                        href={item.href}
                                        aria-current={isActive ? "page" : undefined}
                                        className={cn(
                                            itemClass,
                                            isActive ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                                        )}
                                    >
                                        <Icon
                                            className={cn(
                                                "size-4.5 shrink-0 transition-colors",
                                                isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
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
            <div className="border-t border-border/80 p-3">
                <button
                    type="button"
                    onClick={() => void logoutAdmin()}
                    className={cn(itemClass, "w-full cursor-pointer text-muted-foreground hover:bg-muted/60 hover:text-foreground active:transform-none!")}
                >
                    <LuLogOut className="size-4.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                    <span>Logout</span>
                </button>
            </div>
        </>
    );
}

/** Admin navigation: a fixed column on desktop, a top bar with a slide-in menu on phones. */
export default function AdminSidebar({ role }: { role: UserRole }) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [openedAt, setOpenedAt] = useState(pathname);

    if (menuOpen && pathname !== openedAt) setMenuOpen(false);

    return (
        <>
            <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border/80 bg-white px-4 md:hidden">
                <div className="flex items-center gap-2">
                    <Brand role={role} />
                </div>
                <Button
                    variant="ghost"
                    icon={LuMenu}
                    aria-label="Open menu"
                    aria-expanded={menuOpen}
                    onClick={() => {
                        setOpenedAt(pathname);
                        setMenuOpen(true);
                    }}
                />
            </header>

            <Sheet
                open={menuOpen}
                onOpenChange={setMenuOpen}
                className="inset-y-0 left-0 right-auto top-0 w-72 max-w-[85vw] rounded-none md:hidden"
            >
                <SheetTitle className="sr-only">Admin menu</SheetTitle>
                <div className="flex h-14 items-center justify-between border-b border-border/80 px-4">
                    <Brand role={role} />
                </div>
                <SidebarNav role={role} />
            </Sheet>

            <aside className="sticky top-0 hidden h-screen w-64 shrink-0 select-none flex-col overflow-hidden border-r border-border bg-white md:flex">
                <div className="flex h-14 items-center justify-between border-b border-border/80 px-4">
                    <Brand role={role} />
                </div>
                <SidebarNav role={role} />
            </aside>
        </>
    );
}
