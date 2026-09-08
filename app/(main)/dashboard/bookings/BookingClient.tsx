"use client";

declare const window: { open(url: string, target?: string): void };

import { useRouter } from "next/navigation";
import React, { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  createChargePaymentLinkAction,
  createExtensionPaymentLinkAction,
  deleteReservationAction,
  updateReservationAction
} from "@/app/actions/reservationActions";
import ListingCard from "@/components/listing/ListingCard";
import Modal from "@/components/modals/Modal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
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
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);
  const [infoReservation, setInfoReservation] = useState<SafeReservation | null>(null);

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

  const handleShowInfo = useCallback((reservation: SafeReservation) => {
    setInfoReservation(reservation);
    setInfoModalOpen(true);
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

  const openExtensionPayment = useCallback(async (extensionRequestId: string) => {
    const res = await createExtensionPaymentLinkAction({ extensionRequestId });
    if (res.success && res.data?.paymentUrl) window.open(res.data.paymentUrl, "_self");
    else toast.error(res.error || "Unable to open payment link");
  }, []);

  const openChargePayment = useCallback(async (additionalChargeId: string) => {
    const res = await createChargePaymentLinkAction({ additionalChargeId });
    if (res.success && res.data?.paymentUrl) window.open(res.data.paymentUrl, "_self");
    else toast.error(res.error || "Unable to open payment link");
  }, []);

  const handleConfirmAction = useCallback(() => {
    if (!selectedId) return toast.error("No reservation selected.");

    if (modalAction === "cancel") {
      setDeletingId(selectedId);
      updateReservationAction({ reservationId: selectedId, status: "CANCELLED" })
        .then((res: { success?: boolean; error?: string }) => {
          if (res.success) {
            toast.success("Reservation cancelled", { id: "Reservation_Cancelled" });
            setRefundReservationId(selectedId);
            setRefundOpen(true);
            router.refresh();
          } else toast.error(res.error || "Something went wrong cancelling the reservation.", { id: "Reservation_Error_2" });
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
      deleteReservationAction({ reservationId: selectedId })
        .then((res: { success?: boolean; error?: string }) => {
          if (res.success) {
            toast.info("Reservation deleted", { id: "Reservation_Deleted" });
            router.refresh();
          } else toast.error(res.error || "Something went wrong deleting the reservation.", { id: "Reservation_Error_1" });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {reservations.map((reservation) => (
          <div key={reservation.id} className="space-y-3">
            {(reservation.pendingExtensions?.length || 0) > 0 && (
              <button className="w-full rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-left text-sm font-medium text-foreground" onClick={() => openExtensionPayment(reservation.pendingExtensions![0].id)}>
                Pending extension payment: Rs. {reservation.pendingExtensions![0].extraAmount}
              </button>
            )}
            {(reservation.pendingCharges?.length || 0) > 0 && (
              <button className="w-full rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-left text-sm font-medium text-foreground" onClick={() => openChargePayment(reservation.pendingCharges![0].id)}>
                Pending {reservation.pendingCharges![0].type === "DAMAGE" ? "damage" : "service"} charge: Rs. {reservation.pendingCharges![0].totalAmount}
              </button>
            )}
            <ListingCard data={reservation.listing} reservation={reservation} actionId={reservation.id} onCancel={handleCancelModal} onChat={onChat} onDelete={handleDeleteModal} onShowInfo={handleShowInfo} disabled={deletingId === reservation.id} currentUser={currentUser} allowScale={false} isHost={false} />
          </div>
        ))}
      </div>

      <ReservationDetailModal isOpen={isInfoModalOpen} onCloseAction={() => setInfoModalOpen(false)} reservation={infoReservation} />

      {isModalOpen && (
        <Modal isOpen={isModalOpen} onCloseAction={() => !deletingId && setModalOpen(false)} onSubmitAction={handleConfirmAction} title={modalAction === "cancel" ? "Cancel Reservation" : "Delete Reservation"} body={<p className="text-center">Are you sure you want to {modalAction === "cancel" ? "cancel" : "delete"} this reservation?</p>} actionLabel={modalAction === "cancel" ? "Cancel Reservation" : "Delete Reservation"} secondaryActionAction={() => !deletingId && setModalOpen(false)} secondaryActionLabel="Close" />
      )}

      {isRefundOpen && (
        <Modal
          isOpen={isRefundOpen}
          onCloseAction={() => setRefundOpen(false)}
          onSubmitAction={handleRefundContact}
          title="Booking Cancelled"
          body={(() => {
            const r = reservations.find((x) => x.id === refundReservationId);
            const studioName = r?.listing?.title || "this studio";
            return <div className="space-y-4"><p>We&apos;re sorry to hear you couldn&apos;t go ahead with your booking at {studioName}.</p><p>Refunds are handled by the ContCave team according to the booking policy. Tap below to contact support so they can review and record the refund outcome.</p></div>;
          })()}
          actionLabel="Contact Support on WhatsApp"
        />
      )}
    </>
  );
}

export default BookingClient;
