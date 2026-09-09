"use client";

import React from "react";
import { IoInformationCircleOutline } from "react-icons/io5";

import Button from "@/components/ui/Button";
import { SafeReservation } from "@/types/reservation";

interface ListingCardActionsProps {
    id: string;
    reservation?: SafeReservation;
    onEdit?: (id: string) => void;
    onApprove?: (id: string) => void;
    onChat?: (id: string) => void;
    onDelete?: (id: string) => void;
    onCancel?: (id: string) => void;
    onReject?: (id: string) => void;
    onCheckIn?: (id: string) => void;
    onComplete?: (id: string) => void;
    onNoShow?: (id: string) => void;
    onExtend?: (reservation: SafeReservation) => void;
    onAddCharge?: (reservation: SafeReservation, type: "SERVICE" | "DAMAGE") => void;
    onShowInfo?: (reservation: SafeReservation) => void;
    actionId?: string;
    disabled?: boolean;
    actionLabel?: string;
    isHost?: boolean;
}

const ListingCardActions: React.FC<ListingCardActionsProps> = ({
    id,
    reservation,
    onEdit,
    onApprove,
    onChat,
    onDelete,
    onCancel,
    onReject,
    onCheckIn,
    onComplete,
    onNoShow,
    onExtend,
    onAddCharge,
    onShowInfo,
    actionId,
    disabled,
    actionLabel,
    isHost,
}) => {
    const completedAt = reservation?.completedAt ? new Date(reservation.completedAt) : null;
    const canAddPostBookingCharge = Boolean(
        reservation?.status === "CHECKED_IN" ||
        (reservation?.status === "COMPLETED" && completedAt && Date.now() - completedAt.getTime() <= 24 * 60 * 60 * 1000)
    );
    const isPendingApproval = reservation?.status === "PENDING_APPROVAL";
    const isTerminal = Boolean(reservation && ["CANCELLED", "COMPLETED", "NO_SHOW", "REFUNDED", "PARTIALLY_REFUNDED"].includes(reservation.status));
    const showActions = onEdit || onDelete || onCancel || (isPendingApproval && isHost) || (!isPendingApproval && onChat)
        || onCheckIn || onComplete || onNoShow || onExtend || onAddCharge;

    if (!showActions) return null;

    return (
        <div className="flex mt-3 gap-2">
            {reservation && onShowInfo && (
                <Button
                    icon={IoInformationCircleOutline}
                    variant="outline"
                    isIconOnly={false}
                    onClick={(e) => { e?.stopPropagation(); onShowInfo(reservation); }}
                    disabled={disabled}
                    size="sm"
                    className="w-10 h-10 p-0 flex items-center justify-center shrink-0"
                />
            )}
            <div className="flex gap-2 flex-1">
                {onEdit && id && (
                    <Button
                        label="Manage Studio"
                        href={`/dashboard/properties/${id}`}
                        disabled={disabled}
                        size="sm"
                    />
                )}

                {onDelete && (id || actionId) && !reservation && (
                    <Button
                        label={actionLabel || "Delete"}
                        variant="destructive"
                        onClick={(e) => {
                            e?.stopPropagation();
                            onDelete(String(actionId || id));
                        }}
                        disabled={disabled}
                        size="sm"
                        outline
                    />
                )}

                {reservation && isPendingApproval && isHost && (
                    <div className="flex gap-2 w-full">
                        <Button
                            label="Approve"
                            variant="success"
                            onClick={(e) => { e?.stopPropagation(); onApprove?.(String(reservation?.id)); }}
                            disabled={disabled}
                            size="sm"
                            className="flex-1"
                        />
                        <Button
                            label="Decline"
                            variant="destructive"
                            outline
                            onClick={(e) => { e?.stopPropagation(); onReject?.(String(reservation?.id)); }}
                            disabled={disabled}
                            size="sm"
                            className="flex-1"
                        />
                    </div>
                )}

                {reservation && (!isPendingApproval || !isHost) && (
                    <div className="flex flex-col gap-2 w-full">
                        {isHost && reservation.status === "CONFIRMED" && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button label="Check In" variant="success" onClick={(e) => { e?.stopPropagation(); onCheckIn?.(String(reservation.id)); }} disabled={disabled} size="sm" />
                                <Button label="No Show" variant="outline" onClick={(e) => { e?.stopPropagation(); onNoShow?.(String(reservation.id)); }} disabled={disabled} size="sm" />
                            </div>
                        )}
                        {isHost && reservation.status === "CHECKED_IN" && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button label="Complete" variant="success" onClick={(e) => { e?.stopPropagation(); onComplete?.(String(reservation.id)); }} disabled={disabled} size="sm" />
                                <Button label="Extend" variant="outline" onClick={(e) => { e?.stopPropagation(); onExtend?.(reservation); }} disabled={disabled} size="sm" />
                            </div>
                        )}
                        {isHost && canAddPostBookingCharge && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button label="Add Services" variant="outline" onClick={(e) => { e?.stopPropagation(); onAddCharge?.(reservation, "SERVICE"); }} disabled={disabled} size="sm" />
                                <Button label="Damage" variant="outline" onClick={(e) => { e?.stopPropagation(); onAddCharge?.(reservation, "DAMAGE"); }} disabled={disabled} size="sm" />
                            </div>
                        )}
                        <div className="flex gap-2 w-full">
                        {onChat && (
                            <Button
                                label={isHost ? "Chat with Client" : "Chat with Host"}
                                variant={reservation.status === "CONFIRMED" || reservation.status === "CHECKED_IN" ? "default" : "outline"}
                                onClick={(e) => { e?.stopPropagation(); onChat(String(reservation?.id)); }}
                                disabled={!(reservation.status === "CONFIRMED" || reservation.status === "CHECKED_IN" || reservation.status === "COMPLETED") || disabled}
                                size="sm"
                                className="flex-1 whitespace-nowrap"
                            />
                        )}
                        {onCancel && isPendingApproval && (
                            <Button
                                label="Cancel"
                                variant="outline"
                                onClick={(e) => { e?.stopPropagation(); onCancel(String(reservation.id)); }}
                                disabled={disabled}
                                size="sm"
                                className="flex-1"
                            />
                        )}
                        {isTerminal && onDelete && (
                            <Button
                                label="Delete"
                                variant="outline"
                                onClick={(e) => { e?.stopPropagation(); onDelete(String(reservation.id)); }}
                                disabled={disabled}
                                size="sm"
                                className="flex-1"
                            />
                        )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(ListingCardActions);
