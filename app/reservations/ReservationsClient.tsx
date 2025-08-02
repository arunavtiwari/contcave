"use client";

import { SafeReservation, SafeUser } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { toast } from "react-toastify";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import BookingCard from "@/components/listing/BookingCard";
import Modal from "@/components/modals/Modal";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function ReservationsClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"cancel" | "delete" | "">("");
  const [selectedId, setSelectedId] = useState("");

  const handleCancelModal = useCallback((id: string) => {
    setSelectedId(id);
    setModalAction("cancel");
    setModalOpen(true);
  }, []);

  const handleDeleteModal = useCallback((id: string) => {
    setSelectedId(id);
    setModalAction("delete");
    setModalOpen(true);
  }, []);

  const onApprove = useCallback(
    (id: string) => {
      setDeletingId(id);
      axios
        .patch(`/api/reservations/${id}`, { isApproved: 1 })
        .then(() => {
          toast.success("Reservation approved", {
            toastId: "Reservation_Approved",
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_3",
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
            toastId: "Reservation_Rejected",
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_4",
          });
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router]
  );

  const onChat = useCallback((id: string) => {
    window.open(`/chat/${id}`, "_blank");
  }, []);

  const handleConfirmAction = useCallback(() => {
    setDeletingId(selectedId);
    if (modalAction === "cancel") {
      axios
        .patch(`/api/reservations/${selectedId}`, { isApproved: 3 })
        .then(() => {
          toast.success("Reservation cancelled", {
            toastId: "Reservation_Cancelled",
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_1",
          });
        })
        .finally(() => {
          setDeletingId("");
          setModalOpen(false);
          setModalAction("");
        });
    } else if (modalAction === "delete") {
      axios
        .delete(`/api/reservations/${selectedId}`)
        .then(() => {
          toast.info("Reservation deleted", {
            toastId: "Reservation_Deleted",
          });
          router.refresh();
        })
        .catch((error) => {
          toast.error(error?.response?.data?.error, {
            toastId: "Reservation_Error_2",
          });
        })
        .finally(() => {
          setDeletingId("");
          setModalOpen(false);
          setModalAction("");
        });
    }
  }, [selectedId, modalAction, router]);

  return (
    <div className="mt-5">
      <Container>
        <Heading title="Reservations" subtitle="Bookings on your properties" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
          {reservations.map((reservation) => (
            <BookingCard
              key={reservation.id}
              data={reservation.listing}
              reservation={reservation}
              actionId={reservation.id}
              onAction={() => handleCancelModal(reservation.id)}
              onDelete={() => handleDeleteModal(reservation.id)}
              onApprove={() => onApprove(reservation.id)}
              onReject={() => onReject(reservation.id)}
              onChat={() => onChat(reservation.id)}
              disabled={deletingId === reservation.id}
              actionLabel="Cancel reservation"
              currentUser={currentUser}
            />
          ))}
        </div>
      </Container>
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleConfirmAction}
          title={modalAction === "cancel" ? "Cancel Reservation" : "Delete Reservation"}
          body={
            <p className="text-center">
              Are you sure you want to {modalAction === "cancel" ? "cancel" : "delete"} this reservation?
            </p>
          }
          actionLabel={modalAction === "cancel" ? "Cancel Reservation" : "Delete Reservation"}
          secondaryAction={() => setModalOpen(false)}
          secondaryActionLabel="Cancel"
        />
      )}
    </div>
  );
}

export default ReservationsClient;