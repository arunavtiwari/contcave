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
    onShowInfo,
    actionId,
    disabled,
    actionLabel,
    isHost,
}) => {
    const showActions = onEdit || onDelete || onCancel || (!reservation?.isApproved && isHost) || (reservation?.isApproved !== 0 && onChat);

    if (!showActions) return null;

    return (
        <div className="flex mt-4 pt-1 gap-2">
            {reservation && onShowInfo && (
                <Button
                    icon={IoInformationCircleOutline}
                    variant="outline"
                    onClick={(e) => { e?.stopPropagation(); onShowInfo(reservation); }}
                    disabled={disabled}
                    size="sm"
                    className="w-fit shrink-0"
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

                {reservation && reservation.isApproved === 0 && isHost && (
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

                {reservation && (reservation?.isApproved !== 0 || !isHost) && (
                    <div className="flex gap-2 w-full">
                        {onChat && (
                            <Button
                                label={isHost ? "Chat Client" : "Chat Host"}
                                variant={reservation.isApproved === 1 ? "default" : "outline"}
                                onClick={(e) => { e?.stopPropagation(); onChat(String(reservation?.id)); }}
                                disabled={reservation.isApproved !== 1 || disabled}
                                size="sm"
                                className="flex-1 whitespace-nowrap"
                            />
                        )}
                        {onCancel && (reservation.isApproved === 1 || reservation.isApproved === 0) && (
                            <Button
                                label="Cancel"
                                variant="outline"
                                onClick={(e) => { e?.stopPropagation(); onCancel(String(reservation.id)); }}
                                disabled={disabled}
                                size="sm"
                                className="flex-1"
                            />
                        )}
                        {(reservation.isApproved === 2 || reservation.isApproved === 3) && onDelete && (
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
                )}
            </div>
        </div>
    );
};

export default React.memo(ListingCardActions);
