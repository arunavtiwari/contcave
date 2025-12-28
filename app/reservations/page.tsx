import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservation from "@/app/actions/getReservations";
import ReservationsClient from "./ReservationsClient";
import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/seo";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Guest Reservations | ${BRAND_NAME}`,
  description: "Track and manage upcoming reservations across your ContCave listings.",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

type Props = {};

const ReservationsPage = async (props: Props) => {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title="Unauthorized" subtitle="Please login" />
      </ClientOnly>
    );
  }

  const reservations = await getReservation({
    authorId: currentUser.id,
  });

  if (reservations.length === 0) {
    return (
      <ClientOnly>
        <EmptyState
          title="No Reservation found"
          subtitle="Looks like you have no reservations on your properties."
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <ReservationsClient
        reservations={reservations}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
};

export default ReservationsPage;
