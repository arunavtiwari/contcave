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
export const dynamic = "force-dynamic"

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function BookingClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [isRefundOpen, setRefundOpen] = useState(false);
  const [refundReservationId, setRefundReservationId] = useState<string>("");
  const [isConfirmOpen, setConfirmOpen] = useState(false);
  const [confirmReservationId, setConfirmReservationId] = useState<string>("");
  const handleRefundContact = useCallback(() => {
    const r = reservations.find(x => x.id === refundReservationId);
    const studio = r?.listing?.title || "the studio";
    const rid = r?.id || refundReservationId;
    const msg = encodeURIComponent(`Hi ContCave team, I cancelled my booking for ${studio}. Reservation ID: ${rid}. Please help with refund.`);
    const num = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || "").replace(/[^0-9]/g, "");
    const url = num ? `https://wa.me/${num}?text=${msg}` : `https://wa.me/?text=${msg}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setRefundOpen(false);
  }, [reservations, refundReservationId]);

  const onChat = useCallback((id: string) => {
    window.open(`/chat/${id}`, "_blank")
  }, []);
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
          setRefundReservationId(id);
          setRefundOpen(true);
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

  const openCancelConfirm = useCallback((id: string) => {
    setConfirmReservationId(id);
    setConfirmOpen(true);
  }, []);

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
              onAction={openCancelConfirm}
              onChat={onChat}
              onDelete={onDelete}
              disabled={deletingId === reservation.id}
              actionLabel="Cancel reservation"
              currentUser={currentUser}
            />
          ))}
        </div>
      </Container>
      {isConfirmOpen && (
        <Modal
          isOpen={isConfirmOpen}
          onClose={() => setConfirmOpen(false)}
          onSubmit={() => { setConfirmOpen(false); onCancel(confirmReservationId); }}
          title="Cancel Reservation"
          body={<p className="text-center">Are you sure you want to cancel this reservation?</p>}
          actionLabel="Cancel Reservation"
          secondaryAction={() => setConfirmOpen(false)}
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
            const r = reservations.find(x => x.id === refundReservationId);
            const studioName = r?.listing?.title || "this studio";
            return (
              <div className="space-y-4">
                <p>
                  We’re sorry to hear you couldn’t go ahead with your booking at {studioName}.
                </p>
                <p>
                  Refunds are processed manually by our support team based on our cancellation policy.
                  Tap below to connect with us on WhatsApp – we’ll help you sort your refund right away.
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
