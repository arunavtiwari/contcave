import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

import getCurrentUser from "@/app/actions/getCurrentUser";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
    title: "Admin Dashboard",
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

    const isAdmin = (currentUser as unknown as { isAdmin?: boolean })?.isAdmin;

    if (!currentUser || !isAdmin) {
        redirect("/");
    }

    return (
        <div className="flex min-h-screen bg-neutral-50">
            <AdminSidebar />
            <main className="flex-1 p-6 sm:p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}
