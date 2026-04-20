"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { deleteReservation, updateReservation } from "@/app/actions/reservationActions";
import ListingCard from "@/components/listing/ListingCard";
import Modal from "@/components/modals/Modal";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

type Props = {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
};

function ReservationsClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");

  const [isModalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"cancel" | "delete" | "reject" | "">("");
  const [selectedId, setSelectedId] = useState("");

  const [rejectReasonOption, setRejectReasonOption] = useState("");
  const [rejectReasonText, setRejectReasonText] = useState("");

  const resetModal = useCallback(() => {
    setModalOpen(false);
    setModalAction("");
    setRejectReasonOption("");
    setRejectReasonText("");
    setSelectedId("");
  }, []);

  const handleDeleteModal = useCallback((id: string) => {
    setSelectedId(id);
    setModalAction("delete");
    setModalOpen(true);
  }, []);

  const handleCancelModal = useCallback((id: string) => {
    setSelectedId(id);
    setModalAction("cancel");
    setModalOpen(true);
  }, []);

  const handleRejectModal = useCallback((id: string) => {
    setSelectedId(id);
    setRejectReasonOption("");
    setRejectReasonText("");
    setModalAction("reject");
    setModalOpen(true);
  }, []);

  const onApprove = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await updateReservation(id, { isApproved: 1 });
        if (res.success) {
          toast.success("Reservation approved", { id: "Reservation_Approved" });
          router.refresh();
        } else {
          toast.error(res.error || "Something went wrong approving the reservation.", { id: "Reservation_Error_3" });
        }
      } catch (error: unknown) {
        toast.error("Something went wrong", { id: "Reservation_Error_3" });
      } finally {
        setDeletingId("");
      }
    },
    [router]
  );

  const onReject = useCallback((id: string) => {
    handleRejectModal(id);
  }, [handleRejectModal]);

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
        .then((res) => {
          if (res.success) {
            toast.success("Reservation cancelled", { id: "Reservation_Cancelled" });
            router.refresh();
          } else {
            toast.error(res.error || "Something went wrong", { id: "Reservation_Error_1" });
          }
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });

    } else if (modalAction === "delete") {
      setDeletingId(selectedId);
      deleteReservation(selectedId)
        .then((res) => {
          if (res.success) {
            toast.info("Reservation deleted", { id: "Reservation_Deleted" });
            router.refresh();
          } else {
            toast.error(res.error || "Something went wrong", { id: "Reservation_Error_2" });
          }
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });

    } else if (modalAction === "reject") {
      const isOther = rejectReasonOption === "Other (please specify)";
      const finalReason = isOther ? rejectReasonText.trim() : rejectReasonOption.trim();

      if (!finalReason) {
        return toast.error("Please select or enter a rejection reason");
      }
      if (isOther && finalReason.length < 10) {
        return toast.error("Please enter at least 10 characters for the reason");
      }

      setDeletingId(selectedId);
      updateReservation(selectedId, {
        isApproved: 2,
        rejectReason: finalReason,
      })
        .then((res) => {
          if (res.success) {
            toast.info("Reservation rejected", { id: "Reservation_Rejected" });
            router.refresh();
          } else {
            toast.error(res.error || "Something went wrong", { id: "Reservation_Error_4" });
          }
        })
        .finally(() => {
          setDeletingId("");
          resetModal();
        });
    }
  }, [
    modalAction,
    selectedId,
    rejectReasonOption,
    rejectReasonText,
    router,
    resetModal,
  ]);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {reservations.map((reservation) => {
          return (
            <ListingCard
              key={reservation.id}
              data={reservation.listing}
              reservation={reservation}
              actionId={reservation.id}
              onCancel={handleCancelModal}
              onDelete={handleDeleteModal}
              onApprove={onApprove}
              onReject={onReject}
              onChat={onChat}
              disabled={deletingId === reservation.id}
              currentUser={currentUser}
              allowScale={false}
            />
          );
        })}
      </div>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => !deletingId && setModalOpen(false)}
          onSubmit={handleConfirmAction}
          title={
            modalAction === "reject"
              ? "Reason for Rejecting This Booking"
              : modalAction === "cancel"
                ? "Cancel Reservation"
                : "Delete Reservation"
          }
          body={
            modalAction === "reject" ? (
              <div className="space-y-4">
                <p>Please select or specify a reason. This will be shared with the customer.</p>
                <select
                  className="w-full border rounded-md p-2"
                  value={rejectReasonOption}
                  onChange={(e) => setRejectReasonOption(e.target.value)}
                  disabled={!!deletingId}
                >
                  <option value="" disabled hidden> Select a reason </option>
                  <option value="Studio unavailable for the selected date/time"> Studio unavailable for the selected date/time </option>
                  <option value="Technical / maintenance issue"> Technical / maintenance issue </option>
                  <option value="Booking details incomplete or unclear"> Booking details incomplete or unclear </option>
                  <option value="Customer requested cancellation"> Customer requested cancellation </option>
                  <option value="Other (please specify)"> Other (please specify) </option>
                </select>

                {rejectReasonOption === "Other (please specify)" && (
                  <textarea
                    className="w-full border rounded-md p-2"
                    rows={4}
                    placeholder="Enter brief reason (min. 10 characters)"
                    value={rejectReasonText}
                    onChange={(e) => setRejectReasonText(e.target.value)}
                    disabled={!!deletingId}
                  />
                )}
              </div>
            ) : (
              <p className="text-center">
                Are you sure you want to {modalAction === "cancel" ? "cancel" : "delete"} this reservation?
              </p>
            )
          }
          actionLabel={
            modalAction === "reject"
              ? "Reject Booking"
              : modalAction === "cancel"
                ? "Cancel Reservation"
                : "Delete Reservation"
          }
          secondaryAction={() => !deletingId && setModalOpen(false)}
          secondaryActionLabel="Close"
        />
      )}
    </>
  );
}

export default ReservationsClient;
