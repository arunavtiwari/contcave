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
        <div className="flex min-h-screen flex-col bg-neutral-50/60 md:flex-row">
            <AdminSidebar role={currentUser.role} />
            <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-5">
                <div className="mx-auto max-w-7xl w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
