"use client";

declare const window: { open(url: string, target?: string): void };

import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

import { deleteReservation, updateReservation } from "@/app/actions/reservationActions";
import BookingCard from "@/components/listing/BookingCard";
import Modal from "@/components/modals/Modal";
import Heading from "@/components/ui/Heading";
import { openWhatsAppSupport } from "@/lib/whatsapp/whatsappSupport";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

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
    const rid = r?.bookingId || refundReservationId;
    const msg = `Hi ContCave team, I cancelled my booking for ${studio}. Reservation ID: RID. Please help with refund.`;
    openWhatsAppSupport(msg.replace("RID", rid));
    setRefundOpen(false);
  }, [reservations, refundReservationId]);

  const onChat = useCallback((id: string) => {
    window.open(`/dashboard/chat/${id}`, "_blank");
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (!selectedId) {
      return toast.error("No reservation selected.");
    }

    if (modalAction === "cancel") {
      setDeletingId(selectedId);
      updateReservation(selectedId, { isApproved: 3 })
        .then(() => {
          toast.success("Reservation cancelled", { id: "Reservation_Cancelled" });
          setRefundReservationId(selectedId);
          setRefundOpen(true);
          router.refresh();
        })
        .catch((error: unknown) => {
          const msg = error instanceof Error ? error.message : "Something went wrong cancelling the reservation.";
          toast.error(msg, { id: "Reservation_Error_2" });
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });
    } else if (modalAction === "delete") {
      setDeletingId(selectedId);
      deleteReservation(selectedId)
        .then(() => {
          toast.info("Reservation deleted", { id: "Reservation_Deleted" });
          router.refresh();
        })
        .catch((error: unknown) => {
          const msg = error instanceof Error ? error.message : "Something went wrong deleting the reservation.";
          toast.error(msg, { id: "Reservation_Error_1" });
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });
    }
  }, [modalAction, selectedId, router, resetModal]);

  return (
    <>
      <Heading title="My Bookings" subtitle="Spaces booked by you" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
    </>
  );
}

export default BookingClient;
