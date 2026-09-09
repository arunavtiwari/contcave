import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import CreateCuratedListingForm from "@/components/admin/CreateCuratedListingForm";

export const metadata = { title: "Create Curated Listing" };

export default async function CreateCuratedListingPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") redirect("/admin");

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="rounded-2xl border border-border bg-background p-6">
                <CreateCuratedListingForm />
            </div>
        </div>
    );
}
