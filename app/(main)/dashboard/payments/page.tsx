import { Metadata } from "next";

import getCurrentUser from "@/app/actions/getCurrentUser";
import getTransactions from "@/app/actions/getTransactions";
import EmptyState from "@/components/EmptyState";
import ManagePayments from "@/components/profile/ManagePayments/ManagePayments";
import { getPaymentDetailsSafe } from "@/lib/payment-details";
import { PaymentProfile } from "@/types/payment";

export const metadata: Metadata = {
    title: "Manage Payments",
};

const PaymentsPage = async () => {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return <EmptyState title="Unauthorized" subtitle="Please login" />;
    }

    if (!currentUser.is_owner) {
        return <EmptyState title="Access Denied" subtitle="Only owners can manage payments" />;
    }

    const [paymentDetailsResult, transactions] = await Promise.all([
        getPaymentDetailsSafe(currentUser.id),
        getTransactions(currentUser.id, { ownerView: true }),
    ]);

    const paymentDetails = paymentDetailsResult.success ? (paymentDetailsResult.data as unknown as PaymentProfile) : null;

    return (
        <ManagePayments
            profile={currentUser}
            paymentDetails={paymentDetails}
            transactions={transactions || []}
            paymentDataLoading={false}
        />
    );
};

export default PaymentsPage;
