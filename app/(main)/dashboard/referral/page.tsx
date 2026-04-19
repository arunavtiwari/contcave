import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import ShareAndRefer from "@/components/profile/ShareAndRefer";

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
