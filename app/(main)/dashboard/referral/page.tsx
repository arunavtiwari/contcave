import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import ShareAndRefer from "@/components/profile/ShareAndRefer";
import EmptyState from "@/components/shared/EmptyState";

export const metadata: Metadata = {
    title: "Referral",
};

const ReferralPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <EmptyState title="Unauthorized" subtitle="Please login" />;
    }

    return <ShareAndRefer profile={currentUser} />;
};

export default ReferralPage;
