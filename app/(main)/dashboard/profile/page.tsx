import type { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import MyProfile from "@/components/profile/MyProfile";
import EmptyState from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profile",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

const ProfilePage = async ({
  searchParams,
}: {
  searchParams: Promise<{ becomeOwner?: string; verify?: string }>;
}) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <EmptyState title="Unauthorized" subtitle="Please login" />
    );
  }

  const { becomeOwner, verify } = await searchParams;
  return (
    <MyProfile
      profile={currentUser}
      openOwnerOnLoad={becomeOwner === "1"}
      openVerificationOnLoad={verify === "1"}
    />
  );
};

export default ProfilePage;
