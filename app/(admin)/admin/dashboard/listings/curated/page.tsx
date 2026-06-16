import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import CreateCuratedListingForm from "@/components/admin/CreateCuratedListingForm";

export const metadata = { title: "Create Curated Listing" };

export default async function CreateCuratedListingPage() {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") redirect("/admin");

    return (
        <div className="max-w-2xl mx-auto px-4 py-10">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-1">Create Curated Listing</h1>
                <p className="text-sm text-muted-foreground">
                    Publishes immediately as a live ContCave Curated listing.
                    If a contact email is provided, an outreach notification is sent automatically.
                </p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-6 shadow-sm">
                <CreateCuratedListingForm />
            </div>
        </div>
    );
}
