"use client";

import { SafeReservation, SafeUser } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { toast } from "react-toastify";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import ListingCard from "@/components/listing/ListingCard";
import BookingCard from "@/components/listing/BookingCard";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function ReservationsClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");


  //0->Pending | 1->Approved | 2->Rejected | 3->Cancelled

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
            toastId: "Reservation_Error_1"
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );

  const onDelete = useCallback(
    (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/reservations/${id}`)
        .then(() => {
          toast.info("Reservation deleted", {
            toastId: "Reservation_Deleted"
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

  const onApprove = useCallback(
    (id: string) => {
      setDeletingId(id);

      axios
        .patch(`/api/reservations/${id}`, { isApproved: 1 })
        .then(() => {
          toast.success("Reservation approved", {
            toastId: "Reservation_Approved"
          });
          let rItem = reservations.find((item) => item.id == id);
          if (rItem) {
            rItem.isApproved = 1;
          }
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_3"
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );


  const onReject = useCallback(
    (id: string) => {
      setDeletingId(id);

      axios
        .patch(`/api/reservations/${id}`, { isApproved: 2 })
        .then(() => {
          toast.info("Reservation rejected", {
            toastId: "Reservation_Rejected"
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_4"
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );
  const onChat = useCallback(
    (id: string) => {
      window.open(`/chat/${id}`, "_blank")

    },
    [router]
  );
  return (
    <Container>
      <Heading title="Reservations" subtitle="Bookings on your properties" />
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
        {reservations.map((reservation) => (
          <BookingCard
            key={reservation.id}
            data={reservation.listing}
            reservation={reservation}
            actionId={reservation.id}
            onAction={onCancel}
            onChat={onChat}
            onApprove={onApprove}
            onReject={onReject}
            onDelete={onDelete}
            disabled={deletingId === reservation.id}
            actionLabel="Cancel reservation"
            currentUser={currentUser}
          />
        ))}
      </div>
    </Container>
  );
}

export default ReservationsClient;
