import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "../actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import ProfileTransactionClient from "./ProfileTransactionClient";
export const dynamic = "force-dynamic"

type Props = {};

const ProfileTransaction = async (props: Props) => {
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
      <ProfileTransactionClient profile={currentUser} />
    </ClientOnly>
  );
};

export default ProfileTransaction;
