
import getAmenities from "@/app/actions/getAmenities";
import CreateCuratedListingForm from "@/components/admin/CreateCuratedListingForm";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata = { title: "Create Curated Listing" };

export default async function CreateCuratedListingPage() {
    await requireAdminPage("listings.manage");

    const amenities = await getAmenities();

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="rounded-2xl border border-border bg-background p-6">
                <CreateCuratedListingForm amenities={amenities} />
            </div>
        </div>
    );
}
