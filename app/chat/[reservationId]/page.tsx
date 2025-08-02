import getCurrentUser from "@/app/actions/getCurrentUser";
import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import ChatClient from "../ChatClient";
import Container from "@/components/Container";

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
    <div className="mt-5">
      <Container>
        <ClientOnly>
          <ChatClient profile={currentUser} />
        </ClientOnly>
      </Container>
    </div>
  );
};

export default Profile;
