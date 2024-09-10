import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "../actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import PaymentDetailsClient from "./PaymentDetailsClient";


type Props = {};

const PaymentDetails = async (props: Props) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }
  return (
    <ClientOnly>
      <PaymentDetailsClient profile={currentUser} />
    </ClientOnly>
  );
};

export default PaymentDetails;
