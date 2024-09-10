import ClientOnly from "@/components/ClientOnly";
import getCurrentUser from "../actions/getCurrentUser";
import EmptyState from "@/components/EmptyState";
import ProfileSettingsClient from "./ProfileSettingsClient";


type Props = {};

const ProfileSettings = async (props: Props) => {
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
      <ProfileSettingsClient profile={currentUser} />
    </ClientOnly>
  );
};

export default ProfileSettings;
