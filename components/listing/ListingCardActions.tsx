"use client";

import React from "react";

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
    actionId?: string;
    disabled?: boolean;
    actionLabel?: string;
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
    actionId,
    disabled,
    actionLabel,
}) => {
    const showActions = onEdit || onDelete || onCancel || (!reservation?.isApproved && onApprove) || (reservation?.isApproved !== 0 && onChat);

    if (!showActions) return null;

    return (
        <div className="flex mt-4 pt-1 gap-2">
            {onEdit && id && (
                <Button
                    label="Manage Studio"
                    href={`/dashboard/properties/${id}`}
                    disabled={disabled}
                    size="sm"
                />
            )}

            {onDelete && (id || actionId) && (
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

            {reservation && reservation.isApproved === 0 && onApprove && (
                <div className="flex gap-2 w-full">
                    <Button
                        label="Approve"
                        variant="success"
                        onClick={(e) => { e?.stopPropagation(); onApprove(String(reservation?.id)); }}
                        disabled={disabled}
                        size="sm"

                    />
                    <Button
                        label="Decline"
                        variant="destructive"
                        outline
                        onClick={(e) => { e?.stopPropagation(); onReject?.(String(reservation?.id)); }}
                        disabled={disabled}
                        size="sm"
                    />
                </div>
            )}

            {reservation && reservation?.isApproved !== 0 && (
                <div className="flex gap-2 w-full">
                    {onChat && (
                        <Button
                            label={onApprove ? "Chat with Client" : "Chat with Host"}
                            variant={reservation.isApproved === 1 ? "default" : "outline"}
                            onClick={(e) => { e?.stopPropagation(); onChat(String(reservation?.id)); }}
                            disabled={reservation.isApproved !== 1 || disabled}
                            size="sm"
                        />
                    )}
                    {onCancel && (reservation.isApproved === 1 || reservation.isApproved === 0) && (
                        <Button
                            label="Cancel"
                            variant="outline"
                            onClick={(e) => { e?.stopPropagation(); onCancel(String(reservation.id)); }}
                            disabled={disabled}
                            size="sm"
                        />
                    )}
                    {(reservation.isApproved === 2 || reservation.isApproved === 3) && onDelete && (
                        <Button
                            label="Delete"
                            variant="outline"
                            onClick={(e) => { e?.stopPropagation(); onDelete(String(reservation.id)); }}
                            disabled={disabled}
                            size="sm"
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default React.memo(ListingCardActions);
