"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import BookingCard from "@/components/listing/BookingCard";
import { SafeReservation, SafeUser } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { toast } from "react-toastify";
export const dynamic = "force-dynamic"

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function BookingClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");

  const onChat = useCallback((id: string) => {
    window.open(`/chat/${id}`, "_blank")
  }, [router]);
  const onDelete = useCallback(
    (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/reservations/${id}`)
        .then(() => {
          toast.info("Reservation Deleted", {
            toastId: "Reservation_Deleted"
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_1"
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );

  const onCancel = useCallback(
    (id: string) => {
      setDeletingId(id);

      axios
        .patch(`/api/reservations/${id}`, { isApproved: 3 })
        .then(() => {
          toast.success("Reservation cancelled", {
            toastId: "Reservation_Cancelled"
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_2"
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );

  return (
    <div className="mt-5">
      <Container>
        <Heading
          title="My Bookings"
          subtitle="Spaces booked by you"
        />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-8">
          {reservations.map((reservation) => (
            <BookingCard
              key={reservation.id}
              data={reservation.listing}
              reservation={reservation}
              actionId={reservation.id}
              onAction={onCancel}
              onChat={onChat}
              onDelete={onDelete}
              disabled={deletingId === reservation.id}
              actionLabel="Cancel reservation"
              currentUser={currentUser}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}

export default BookingClient;
