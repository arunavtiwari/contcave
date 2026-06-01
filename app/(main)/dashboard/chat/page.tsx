import { redirect } from "next/navigation";

import getCurrentUser from "@/app/actions/getCurrentUser";
import { UserRole } from "@/types/user";

interface SearchParams {
  reservationId?: string;
}

export default async function ChatPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;
  const { reservationId } = searchParams;

  // If a reservationId is passed in search params (legacy URL), redirect to the path-based page
  if (reservationId) {
    redirect(`/dashboard/chat/${reservationId}`);
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/");
  }

  // Redirect owners/admins to guest reservations list, and guests to bookings list where they can access their chats.
  if (currentUser.role === UserRole.OWNER || currentUser.role === UserRole.ADMIN) {
    redirect("/dashboard/reservations");
  } else {
    redirect("/dashboard/bookings");
  }
}
