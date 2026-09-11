import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { isAdmin } from "@/lib/user/permissions";

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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        redirect("/admin");
    }
    if (!isAdmin(currentUser.role)) {
        redirect("/");
    }

    return (
        <div className="flex min-h-screen bg-neutral-50/60">
            <AdminSidebar />
            <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
                <div className="mx-auto max-w-7xl w-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
