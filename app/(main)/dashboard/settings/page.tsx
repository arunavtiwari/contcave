import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import ProfileSettings from "@/components/profile/ProfileSettings";
import EmptyState from "@/components/shared/EmptyState";

export const metadata: Metadata = {
    title: "Settings",
};

const SettingsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <EmptyState title="Unauthorized" subtitle="Please login" />;
    }

    return <ProfileSettings profile={currentUser} />;
};

export default SettingsPage;
