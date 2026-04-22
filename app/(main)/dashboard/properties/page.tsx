import type { Metadata } from "next";
import { Suspense } from "react";

import PropertiesClient from "@/app/(main)/dashboard/properties/PropertiesClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import EmptyState from "@/components/EmptyState";
import ListingGridSkeleton from "@/components/listing/ListingGridSkeleton";
import { safeListing } from "@/types/listing";

export const metadata: Metadata = {
  title: "My Properties",
  description: "Manage the listings you host on ContCave, update details, and keep availability in sync.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

import Heading from "@/components/ui/Heading";

const PropertiesPage = () => {
  return (
    <div className="space-y-8">
      <Heading title="My Properties" subtitle="Efficiently Manage, Update, and Showcase Your Listings with Ease." />
      <Suspense fallback={<ListingGridSkeleton count={6} />}>
        <PropertiesContent />
      </Suspense>
    </div>
  );
};

async function PropertiesContent() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const listings = await getListings({ userId: currentUser.id });

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No Properties found"
        subtitle="Looks like you don't have any Listing"
      />
    );
  }

  return <PropertiesClient listings={listings as unknown as safeListing[]} currentUser={currentUser} />;
}

export default PropertiesPage;
