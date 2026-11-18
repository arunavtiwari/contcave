import { Metadata } from "next";
import React from "react";

import AdminSidebar from "@/components/admin/AdminSidebar";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata: Metadata = {
    title: "Dashboard",
    description: "Contcave Admin Dashboard",
    robots: {
        index: false,
        follow: false,
    },
};

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const currentUser = await requireAdminPage();

    return (
        <div className="flex min-h-screen bg-neutral-50/60">
            <AdminSidebar role={currentUser.role} />
            <main className="flex-1 min-w-0 p-5 overflow-y-auto">
                <div className="mx-auto max-w-7xl w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
