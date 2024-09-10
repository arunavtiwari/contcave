import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "../actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import ProfileShareClient from "./ProfileShareClient";


type Props = {};

const ProfileShare= async (props: Props) => {
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
      <ProfileShareClient profile={currentUser} />
    </ClientOnly>
  );
};

export default ProfileShare;
