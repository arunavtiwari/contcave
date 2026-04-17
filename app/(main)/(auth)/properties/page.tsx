import type { Metadata } from "next";

import PropertiesClient from "@/app/(main)/(auth)/properties/PropertiesClient";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import EmptyState from "@/components/EmptyState";

export const metadata: Metadata = {
  title: "My Properties",
  description: "Manage the listings you host on ContCave, update details, and keep availability in sync.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const PropertiesPage = async () => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return <EmptyState title="Unauthorized" subtitle="Please login" />;
  }

  const listings = await getListings({ userId: currentUser.id });

  if (listings.length === 0) {
    return (
      <EmptyState
        title="No Properties found"
        subtitle="Looks like you don&apos;t have any Listing"
      />
    );
  }

  return <PropertiesClient listings={listings} currentUser={currentUser} />;
};

export default PropertiesPage;
