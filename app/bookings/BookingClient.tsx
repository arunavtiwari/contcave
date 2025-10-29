"use client";

import Container from "@/components/Container";
import Heading from "@/components/Heading";
import BookingCard from "@/components/listing/BookingCard";
import Modal from "@/components/modals/Modal";
import { SafeReservation, SafeUser } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { toast } from "react-toastify";
export const dynamic = "force-dynamic";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function BookingClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"cancel" | "delete" | "">("");
  const [selectedId, setSelectedId] = useState("");
  const [isRefundOpen, setRefundOpen] = useState(false);
  const [refundReservationId, setRefundReservationId] = useState<string>("");

  const resetModal = useCallback(() => {
    setModalOpen(false);
    setModalAction("");
    setSelectedId("");
  }, []);

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

  const handleRefundContact = useCallback(() => {
    const r = reservations.find((x) => x.id === refundReservationId);
    const studio = r?.listing?.title || "the studio";
    const rid = r?.id || refundReservationId;
    const msg = encodeURIComponent(
      `Hi ContCave team, I cancelled my booking for ${studio}. Reservation ID: ${rid}. Please help with refund.`
    );
    const num = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/[^0-9]/g, "");
    const url = num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setRefundOpen(false);
  }, [reservations, refundReservationId]);

  const onChat = useCallback((id: string) => {
    window.open(`/chat/${id}`, "_blank");
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (!selectedId) {
      return toast.error("No reservation selected.");
    }

    if (modalAction === "cancel") {
      setDeletingId(selectedId);
      axios
        .patch(`/api/reservations/${selectedId}`, { isApproved: 3 })
        .then(() => {
          toast.success("Reservation cancelled", { toastId: "Reservation_Cancelled" });
          setRefundReservationId(selectedId);
          setRefundOpen(true);
          router.refresh();
        })
        .catch((error) => {
          const msg =
            error?.response?.data?.error || "Something went wrong cancelling the reservation.";
          toast.error(msg, { toastId: "Reservation_Error_2" });
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });
    } else if (modalAction === "delete") {
      setDeletingId(selectedId);
      axios
        .delete(`/api/reservations/${selectedId}`)
        .then(() => {
          toast.info("Reservation deleted", { toastId: "Reservation_Deleted" });
          router.refresh();
        })
        .catch((error) => {
          const msg =
            error?.response?.data?.error || "Something went wrong deleting the reservation.";
          toast.error(msg, { toastId: "Reservation_Error_1" });
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });
    }
  }, [modalAction, selectedId, router, resetModal]);

  return (
    <div className="mt-5">
      <Container>
        <Heading title="My Bookings" subtitle="Spaces booked by you" />
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
          {reservations.map((reservation) => (
            <BookingCard
              key={reservation.id}
              data={reservation.listing}
              reservation={reservation}
              actionId={reservation.id}
              onAction={handleCancelModal}
              onChat={onChat}
              onDelete={handleDeleteModal}
              disabled={deletingId === reservation.id}
              actionLabel="Cancel reservation"
              currentUser={currentUser}
            />
          ))}
        </div>
      </Container>

      {/* Cancel / Delete */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !deletingId && setModalOpen(false)}
          onSubmit={handleConfirmAction}
          title={modalAction === "cancel" ? "Cancel Reservation" : "Delete Reservation"}
          body={
            <p className="text-center">
              Are you sure you want to {modalAction === "cancel" ? "cancel" : "delete"} this reservation?
            </p>
          }
          actionLabel={modalAction === "cancel" ? "Cancel Reservation" : "Delete Reservation"}
          secondaryAction={() => !deletingId && setModalOpen(false)}
          secondaryActionLabel="Close"
        />
      )}

      {/* Refund Info (after cancel) */}
      {isRefundOpen && (
        <Modal
          isOpen={isRefundOpen}
          onClose={() => setRefundOpen(false)}
          onSubmit={handleRefundContact}
          title="Booking Cancelled 😓"
          body={(() => {
            const r = reservations.find((x) => x.id === refundReservationId);
            const studioName = r?.listing?.title || "this studio";
            return (
              <div className="space-y-4">
                <p>We’re sorry to hear you couldn’t go ahead with your booking at {studioName}.</p>
                <p>
                  Refunds are processed manually by our support team based on our cancellation policy. Tap below to
                  connect with us on WhatsApp – we’ll help you sort your refund right away.
                </p>
              </div>
            );
          })()}
          actionLabel="Contact Support on WhatsApp"
        />
      )}
    </div>
  );
}

export default BookingClient;
