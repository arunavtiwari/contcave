import ClientOnly from "@/components/ClientOnly";
import ProfileClient from "./ProfileClient";
import getCurrentUser from "../actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
export const dynamic = "force-dynamic"

type Props = {};

const Profile = async (props: Props) => {
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
      <ProfileClient profile={currentUser} />
    </ClientOnly>
  );
};

export default Profile;
