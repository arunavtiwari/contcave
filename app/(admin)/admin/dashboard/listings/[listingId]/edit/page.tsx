import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { FiArrowLeft } from "react-icons/fi";

import getAddons from "@/app/actions/getAddons";
import getAmenities from "@/app/actions/getAmenities";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListingById from "@/app/actions/getListingById";
import PropertyClient from "@/components/property/PropertyClient";
import { NavTabs } from "@/components/ui/Tabs";
import { adminEditListingHref } from "@/constants/adminNav";
import { MAIN_SIDEBAR_ITEMS } from "@/constants/navigation";
import { isAdmin } from "@/lib/user/permissions";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Edit Studio",
};

// The host dashboard route (/dashboard/properties/[id]) can't be reached from
// the admin domain: the proxy rewrites every non-/admin path under /admin.
const ADMIN_EDIT_TABS = MAIN_SIDEBAR_ITEMS.filter((item) => !item.hiddenForAdmin).map((item) => item.name);

type Params = { listingId: string };
type SearchParams = { tab?: string };

export default async function AdminEditListingPage({
    params,
    searchParams,
}: {
    params: Promise<Params>;
    searchParams: Promise<SearchParams>;
}) {
    const currentUser = await getCurrentUser();
    if (!currentUser) redirect("/admin");
    if (!isAdmin(currentUser.role)) redirect("/");

    const [{ listingId }, { tab }] = await Promise.all([params, searchParams]);
    const [listing, amenitiesData, addonsData] = await Promise.all([
        getListingById({ listingId }),
        getAmenities(),
        getAddons(),
    ]);
    if (!listing) notFound();

    const basePath = adminEditListingHref(listing.id);
    const activeTab = ADMIN_EDIT_TABS.find((t) => t === tab) ?? ADMIN_EDIT_TABS[0];

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-4">
                <Link
                    href={listing.listingType === "CURATED" ? "/admin/dashboard/listings?view=CURATED" : "/admin/dashboard/listings"}
                    className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                >
                    <FiArrowLeft size={14} />
                    Back to listings
                </Link>
                <NavTabs
                    activeId={activeTab}
                    ariaLabel="Studio editor sections"
                    className="max-w-full overflow-x-auto"
                    items={ADMIN_EDIT_TABS.map((t) => ({
                        id: t,
                        label: t,
                        href: `${basePath}?tab=${encodeURIComponent(t)}`,
                    }))}
                />
            </div>
            <div className="rounded-2xl border border-border bg-background p-4 sm:p-6">
                <PropertyClient
                    listing={listing}
                    predefinedAmenities={amenitiesData}
                    predefinedAddons={addonsData}
                    afterDeleteHref="/admin/dashboard/listings"
                    tab={activeTab}
                />
            </div>
        </div>
    );
}
