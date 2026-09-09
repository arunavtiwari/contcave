"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
  cancelAdditionalChargeAction,
  cancelExtensionRequestAction,
  checkInReservationAction,
  completeReservationAction,
  createAdditionalChargeAction,
  createExtensionRequestAction,
  deleteReservationAction,
  getExtensionAvailabilityAction,
  markNoShowReservationAction,
  updateAdditionalChargeAction,
  updateReservationAction,
} from "@/app/actions/reservationActions";
import ListingCard from "@/components/listing/ListingCard";
import Modal from "@/components/modals/Modal";
import ReservationDetailModal from "@/components/modals/ReservationDetailModal";
import Select, { SelectOption } from "@/components/ui/Select";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

const rejectReasonOptions: SelectOption[] = [
  { value: "Studio unavailable for the selected date/time", label: "Studio unavailable for the selected date/time" },
  { value: "Technical / maintenance issue", label: "Technical / maintenance issue" },
  { value: "Booking details incomplete or unclear", label: "Booking details incomplete or unclear" },
  { value: "Customer requested cancellation", label: "Customer requested cancellation" },
  { value: "Other (please specify)", label: "Other (please specify)" },
];

type Props = { reservations: SafeReservation[]; currentUser?: SafeUser | null };
type ListingAddonItem = { id: string; name: string; price: number; qty: number };

function getListingAddonItems(reservation: SafeReservation | null): ListingAddonItem[] {
  const rawAddons = reservation?.listing?.addons;
  if (!Array.isArray(rawAddons)) return [];
  return rawAddons.map((addon, index) => {
    if (!addon || typeof addon !== "object" || Array.isArray(addon)) return null;
    const item = addon as unknown as Record<string, unknown>;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    const price = Math.round(Number(item.price || 0));
    const qty = Math.max(1, Math.round(Number(item.qty || 1)));
    if (!name || price < 0) return null;
    return { id: typeof item.id === "string" && item.id ? item.id : `${name}-${index}`, name, price, qty };
  }).filter((addon): addon is ListingAddonItem => Boolean(addon));
}

function ReservationsClient({ reservations, currentUser }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"delete" | "reject" | "">("");
  const [selectedId, setSelectedId] = useState("");
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);
  const [infoReservation, setInfoReservation] = useState<SafeReservation | null>(null);
  const [rejectReasonOption, setRejectReasonOption] = useState("");
  const [rejectReasonText, setRejectReasonText] = useState("");
  const [extensionReservation, setExtensionReservation] = useState<SafeReservation | null>(null);
  const [extensionDuration, setExtensionDuration] = useState(30);
  const [extensionAmount, setExtensionAmount] = useState(0);
  const [extensionAvailability, setExtensionAvailability] = useState<{ maxDurationMinutes: number; maxEndTime: string; reason?: string | null } | null>(null);
  const [chargeReservation, setChargeReservation] = useState<SafeReservation | null>(null);
  const [editingChargeId, setEditingChargeId] = useState<string | null>(null);
  const [chargeType, setChargeType] = useState<"SERVICE" | "DAMAGE">("SERVICE");
  const [chargeName, setChargeName] = useState("");
  const [chargeQty, setChargeQty] = useState(1);
  const [chargeUnitPrice, setChargeUnitPrice] = useState(0);
  const [chargeNote, setChargeNote] = useState("");

  const resetModal = useCallback(() => {
    setModalOpen(false); setModalAction(""); setRejectReasonOption(""); setRejectReasonText("");
    setSelectedId(""); setInfoModalOpen(false); setInfoReservation(null);
  }, []);
  const handleShowInfo = useCallback((reservation: SafeReservation) => { setInfoReservation(reservation); setInfoModalOpen(true); }, []);
  const handleDeleteModal = useCallback((id: string) => { setSelectedId(id); setModalAction("delete"); setModalOpen(true); }, []);
  const handleRejectModal = useCallback((id: string) => { setSelectedId(id); setRejectReasonOption(""); setRejectReasonText(""); setModalAction("reject"); setModalOpen(true); }, []);

  const onApprove = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const res = await updateReservationAction({ reservationId: id, status: "CONFIRMED" });
      if (res.success) { toast.success("Reservation approved", { id: "Reservation_Approved" }); router.refresh(); }
      else toast.error(res.error || "Something went wrong approving the reservation.", { id: "Reservation_Error_3" });
    } catch { toast.error("Something went wrong", { id: "Reservation_Error_3" }); }
    finally { setDeletingId(""); }
  }, [router]);
  const onReject = useCallback((id: string) => handleRejectModal(id), [handleRejectModal]);
  const onChat = useCallback((id: string) => window.open(`/dashboard/chat/${id}`, "_blank"), []);

  const runReservationAction = useCallback(async (id: string, action: (input: { reservationId: string }) => Promise<{ success?: boolean; error?: string }>, successMessage: string) => {
    setDeletingId(id);
    try {
      const res = await action({ reservationId: id });
      if (res.success) { toast.success(successMessage); router.refresh(); }
      else toast.error(res.error || "Something went wrong");
    } finally { setDeletingId(""); }
  }, [router]);

  const handleExtend = useCallback((reservation: SafeReservation) => {
    const hourlyRate = Number(reservation.listing?.price || 0);
    setExtensionReservation(reservation); setExtensionDuration(30);
    setExtensionAmount(Math.max(1, Math.ceil(hourlyRate / 2))); setExtensionAvailability(null);
    getExtensionAvailabilityAction({ reservationId: reservation.id }).then((res) => {
      if (res.success && res.data) {
        setExtensionAvailability(res.data);
        if (res.data.maxDurationMinutes > 0) setExtensionDuration(Math.min(30, res.data.maxDurationMinutes));
      } else toast.error(res.error || "Unable to check extension availability");
    });
  }, []);

  const handleAddCharge = useCallback((reservation: SafeReservation, type: "SERVICE" | "DAMAGE") => {
    setChargeReservation(reservation); setEditingChargeId(null); setChargeType(type);
    setChargeName(type === "DAMAGE" ? "Damage charge" : ""); setChargeQty(1); setChargeUnitPrice(0); setChargeNote("");
  }, []);
  const handleEditCharge = useCallback((reservation: SafeReservation, chargeId: string) => {
    const charge = reservation.pendingCharges?.find((item) => item.id === chargeId);
    const firstItem = Array.isArray(charge?.items) ? charge.items[0] as { name?: string; qty?: number; unitPrice?: number } : null;
    setChargeReservation(reservation); setEditingChargeId(chargeId); setChargeType(charge?.type || "SERVICE");
    setChargeName(firstItem?.name || ""); setChargeQty(Number(firstItem?.qty || 1));
    setChargeUnitPrice(Number(firstItem?.unitPrice || charge?.totalAmount || 0)); setChargeNote(charge?.note || "");
  }, []);

  const submitExtension = useCallback(async () => {
    if (!extensionReservation) return;
    if (extensionAvailability && extensionAvailability.maxDurationMinutes <= 0) return toast.error("No extension slot is available");
    if (extensionAvailability && extensionDuration > extensionAvailability.maxDurationMinutes) return toast.error("Extension duration exceeds the available slot");
    setDeletingId(extensionReservation.id);
    try {
      const res = await createExtensionRequestAction({ reservationId: extensionReservation.id, durationMinutes: extensionDuration, extraAmount: extensionAmount });
      if (res.success) { toast.success("Extension payment link created"); setExtensionReservation(null); router.refresh(); }
      else toast.error(res.error || "Unable to create extension");
    } finally { setDeletingId(""); }
  }, [extensionAmount, extensionAvailability, extensionDuration, extensionReservation, router]);

  const submitCharge = useCallback(async () => {
    if (!chargeReservation) return;
    setDeletingId(chargeReservation.id);
    try {
      const payload = { items: [{ name: chargeName, qty: chargeQty, unitPrice: chargeUnitPrice }], note: chargeNote };
      const res = editingChargeId
        ? await updateAdditionalChargeAction({ additionalChargeId: editingChargeId, ...payload })
        : await createAdditionalChargeAction({ reservationId: chargeReservation.id, type: chargeType, ...payload });
      if (res.success) { toast.success(editingChargeId ? "Charge updated" : "Charge payment link created"); setChargeReservation(null); setEditingChargeId(null); router.refresh(); }
      else toast.error(res.error || "Unable to create charge");
    } finally { setDeletingId(""); }
  }, [chargeName, chargeNote, chargeQty, chargeReservation, chargeType, chargeUnitPrice, editingChargeId, router]);

  const cancelPendingExtension = useCallback(async (extensionRequestId: string) => {
    const res = await cancelExtensionRequestAction({ extensionRequestId });
    if (res.success) { toast.success("Extension request cancelled"); router.refresh(); } else toast.error(res.error || "Unable to cancel extension");
  }, [router]);
  const cancelPendingCharge = useCallback(async (additionalChargeId: string) => {
    const res = await cancelAdditionalChargeAction({ additionalChargeId });
    if (res.success) { toast.success("Charge cancelled"); router.refresh(); } else toast.error(res.error || "Unable to cancel charge");
  }, [router]);

  const handleConfirmAction = useCallback(() => {
    if (!selectedId) return toast.error("No reservation selected.");
    if (modalAction === "delete") {
      setDeletingId(selectedId);
      deleteReservationAction({ reservationId: selectedId }).then((res) => {
        if (res.success) { toast.info("Reservation deleted", { id: "Reservation_Deleted" }); router.refresh(); }
        else toast.error(res.error || "Something went wrong", { id: "Reservation_Error_2" });
      }).finally(() => { setDeletingId(""); resetModal(); });
    } else if (modalAction === "reject") {
      const isOther = rejectReasonOption === "Other (please specify)";
      const finalReason = isOther ? rejectReasonText.trim() : rejectReasonOption.trim();
      if (!finalReason) return toast.error("Please select or enter a rejection reason");
      if (isOther && finalReason.length < 10) return toast.error("Please enter at least 10 characters for the reason");
      setDeletingId(selectedId);
      updateReservationAction({ reservationId: selectedId, status: "CANCELLED", rejectReason: finalReason }).then((res) => {
        if (res.success) { toast.info("Reservation rejected", { id: "Reservation_Rejected" }); router.refresh(); }
        else toast.error(res.error || "Something went wrong", { id: "Reservation_Error_4" });
      }).finally(() => { setDeletingId(""); resetModal(); });
    }
  }, [modalAction, selectedId, rejectReasonOption, rejectReasonText, router, resetModal]);

  const listingAddonItems = chargeType === "SERVICE" ? getListingAddonItems(chargeReservation) : [];

  return <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {reservations.map((reservation) => <div key={reservation.id} className="space-y-3">
        {(reservation.pendingExtensions || []).map((extension) => <div key={extension.id} className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <div className="font-medium text-foreground">Extension pending payment: Rs. {extension.extraAmount}, until {extension.requestedEndTime}</div>
          <button className="mt-2 text-xs font-semibold underline" onClick={() => cancelPendingExtension(extension.id)}>Cancel request</button>
        </div>)}
        {(reservation.pendingCharges || []).map((charge) => <div key={charge.id} className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
          <div className="font-medium text-foreground">Pending {charge.type === "DAMAGE" ? "damage" : "service"} charge: Rs. {charge.totalAmount}</div>
          <div className="mt-2 flex gap-3 text-xs font-semibold"><button className="underline" onClick={() => handleEditCharge(reservation, charge.id)}>Edit</button><button className="underline" onClick={() => cancelPendingCharge(charge.id)}>Cancel</button></div>
        </div>)}
        <ListingCard data={reservation.listing} reservation={reservation} actionId={reservation.id} onDelete={handleDeleteModal} onApprove={onApprove} onReject={onReject} onCheckIn={(id) => runReservationAction(id, checkInReservationAction, "Reservation checked in")} onComplete={(id) => runReservationAction(id, completeReservationAction, "Reservation completed")} onNoShow={(id) => runReservationAction(id, markNoShowReservationAction, "Reservation marked no-show")} onExtend={handleExtend} onAddCharge={handleAddCharge} onChat={onChat} onShowInfo={handleShowInfo} disabled={deletingId === reservation.id} currentUser={currentUser} allowScale={false} isHost />
      </div>)}
    </div>

    <ReservationDetailModal isOpen={isInfoModalOpen} onCloseAction={() => setInfoModalOpen(false)} reservation={infoReservation} />

    {isModalOpen && <Modal isOpen={isModalOpen} onCloseAction={() => !deletingId && setModalOpen(false)} onSubmitAction={handleConfirmAction} title={modalAction === "reject" ? "Reason for Rejecting This Booking" : "Delete Reservation"} body={modalAction === "reject" ? <div className="space-y-4"><p>Please select or specify a reason. This will be shared with the customer.</p><Select options={rejectReasonOptions} value={rejectReasonOptions.find((option) => option.value === rejectReasonOption) || null} onChange={(selection) => setRejectReasonOption((selection as SelectOption | null)?.value || "")} isDisabled={!!deletingId} placeholder="Select a reason" />{rejectReasonOption === "Other (please specify)" && <textarea className="w-full border rounded-md p-2" rows={4} placeholder="Enter brief reason (min. 10 characters)" value={rejectReasonText} onChange={(event) => setRejectReasonText(event.target.value)} disabled={!!deletingId} />}</div> : <p className="text-center">Are you sure you want to delete this reservation?</p>} actionLabel={modalAction === "reject" ? "Reject Booking" : "Delete Reservation"} secondaryActionAction={() => !deletingId && setModalOpen(false)} secondaryActionLabel="Close" />}

    {extensionReservation && <Modal isOpen onCloseAction={() => !deletingId && setExtensionReservation(null)} onSubmitAction={submitExtension} title="Extend Session" body={<div className="space-y-4">
      {extensionAvailability && <p className="text-sm text-muted-foreground">{extensionAvailability.maxDurationMinutes > 0 ? `Available until ${extensionAvailability.maxEndTime} (${extensionAvailability.maxDurationMinutes} minutes)` : extensionAvailability.reason || "No extension slot is available"}</p>}
      <label className="block text-sm font-medium">Duration (minutes)<input className="mt-1 w-full rounded-md border border-border bg-background p-2" type="number" min={1} max={extensionAvailability?.maxDurationMinutes || undefined} value={extensionDuration} onChange={(event) => setExtensionDuration(Number(event.target.value))} disabled={!!deletingId} /></label>
      <label className="block text-sm font-medium">Amount<input className="mt-1 w-full rounded-md border border-border bg-background p-2" type="number" min={1} value={extensionAmount} onChange={(event) => setExtensionAmount(Number(event.target.value))} disabled={!!deletingId} /></label>
    </div>} actionLabel="Send Payment Link" actionDisabled={Boolean(extensionAvailability && (extensionAvailability.maxDurationMinutes <= 0 || extensionDuration > extensionAvailability.maxDurationMinutes)) || extensionDuration < 1 || extensionAmount < 1} secondaryActionAction={() => !deletingId && setExtensionReservation(null)} secondaryActionLabel="Close" />}

    {chargeReservation && <Modal isOpen onCloseAction={() => { if (!deletingId) { setChargeReservation(null); setEditingChargeId(null); } }} onSubmitAction={submitCharge} title={editingChargeId ? "Edit Charge" : chargeType === "DAMAGE" ? "Damage Charge" : "Add Services"} body={<div className="space-y-4">
      {listingAddonItems.length > 0 && <div><div className="mb-2 text-sm font-medium">Listing services</div><div className="flex flex-wrap gap-2">{listingAddonItems.map((addon) => <button key={addon.id} type="button" className="rounded-md border border-border px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { setChargeName(addon.name); setChargeQty(addon.qty); setChargeUnitPrice(addon.price); }} disabled={!!deletingId}><span className="block font-medium">{addon.name}</span><span className="block text-xs text-muted-foreground">Rs. {addon.price}</span></button>)}</div></div>}
      <label className="block text-sm font-medium">Item name<input className="mt-1 w-full rounded-md border border-border bg-background p-2" value={chargeName} onChange={(event) => setChargeName(event.target.value)} disabled={!!deletingId} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Qty<input className="mt-1 w-full rounded-md border border-border bg-background p-2" type="number" min={1} value={chargeQty} onChange={(event) => setChargeQty(Number(event.target.value))} disabled={!!deletingId} /></label><label className="block text-sm font-medium">Unit price<input className="mt-1 w-full rounded-md border border-border bg-background p-2" type="number" min={1} value={chargeUnitPrice} onChange={(event) => setChargeUnitPrice(Number(event.target.value))} disabled={!!deletingId} /></label></div>
      <label className="block text-sm font-medium">Note<textarea className="mt-1 w-full rounded-md border border-border bg-background p-2" rows={3} value={chargeNote} onChange={(event) => setChargeNote(event.target.value)} disabled={!!deletingId} /></label>
    </div>} actionLabel={editingChargeId ? "Update Charge" : "Send Payment Link"} actionDisabled={!chargeName.trim() || chargeQty < 1 || chargeUnitPrice < 1 || (chargeType === "DAMAGE" && !chargeNote.trim())} secondaryActionAction={() => { if (!deletingId) { setChargeReservation(null); setEditingChargeId(null); } }} secondaryActionLabel="Close" />}
  </>;
}

export default ReservationsClient;
