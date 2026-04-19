import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import ProfileSettings from "@/components/profile/ProfileSettings";

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
