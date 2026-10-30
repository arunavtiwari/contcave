"use client";

import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useRef, useState } from "react";
import {
    FiAlertTriangle,
    FiClock,
    FiMessageSquare,
    FiMoreVertical,
    FiPlusCircle,
    FiTrash2,
    FiXCircle,
} from "react-icons/fi";
import { IoInformationCircleOutline } from "react-icons/io5";

import Button from "@/components/ui/Button";
import { useDismiss } from "@/hooks/useDismiss";
import { canCheckInNow, canMarkNoShowNow, hasSessionEnded } from "@/lib/reservation/status";
import { cn } from "@/lib/utils";
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
    const [isMenuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const closeMenu = useCallback(() => setMenuOpen(false), []);
    useDismiss(menuRef, isMenuOpen, closeMenu);

    const completedAt = reservation?.completedAt ? new Date(reservation.completedAt) : null;
    const canAddPostBookingCharge = Boolean(
        reservation?.status === "CHECKED_IN" ||
        (reservation?.status === "COMPLETED" && completedAt && Date.now() - completedAt.getTime() <= 24 * 60 * 60 * 1000)
    );
    const isPendingApproval = reservation?.status === "PENDING_APPROVAL";
    // Same windows the server enforces: check-in from 30 min before start, no-show from 30 min after,
    // both closing when the slot ends (the booking then completes automatically).
    const session = reservation?.startDate && reservation.startTime && reservation.endTime
        ? { startDate: reservation.startDate, startTime: reservation.startTime, endTime: reservation.endTime }
        : null;
    const checkInOpen = session ? canCheckInNow(session) : false;
    const noShowOpen = session ? canMarkNoShowNow(session) : false;
    const sessionEnded = session ? hasSessionEnded(session) : false;
    const isTerminal = Boolean(reservation && ["CANCELLED", "COMPLETED", "NO_SHOW", "REFUNDED", "PARTIALLY_REFUNDED"].includes(reservation.status));
    const showActions = onEdit || onDelete || onCancel || (isPendingApproval && isHost) || (!isPendingApproval && onChat)
        || onCheckIn || onComplete || onNoShow || onExtend || onAddCharge || onShowInfo;

    if (!showActions) return null;

    const canChat = Boolean(reservation && ["CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(reservation.status));
    const hostHasSessionAction = Boolean(isHost && (reservation?.status === "CONFIRMED" || reservation?.status === "CHECKED_IN"));

    const menuItems: { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; onClick: () => void; isDestructive?: boolean }[] = [];

    if (reservation && onShowInfo) {
        menuItems.push({
            label: "View details",
            icon: IoInformationCircleOutline,
            onClick: () => onShowInfo(reservation),
        });
    }

    if (reservation && onChat && canChat && hostHasSessionAction) {
        menuItems.push({
            label: "Chat with client",
            icon: FiMessageSquare,
            onClick: () => onChat(String(reservation.id)),
        });
    }

    if (isHost && reservation?.status === "CHECKED_IN" && onExtend) {
        menuItems.push({
            label: "Extend session",
            icon: FiClock,
            onClick: () => onExtend(reservation),
        });
    }

    if (isHost && canAddPostBookingCharge && onAddCharge && reservation) {
        menuItems.push({
            label: "Add services",
            icon: FiPlusCircle,
            onClick: () => onAddCharge(reservation, "SERVICE"),
        });
        menuItems.push({
            label: "Report damage",
            icon: FiAlertTriangle,
            onClick: () => onAddCharge(reservation, "DAMAGE"),
            isDestructive: true,
        });
    }

    if (onCancel && isPendingApproval && reservation) {
        menuItems.push({
            label: "Cancel request",
            icon: FiXCircle,
            onClick: () => onCancel(String(reservation.id)),
            isDestructive: true,
        });
    }

    if (isTerminal && onDelete && reservation) {
        menuItems.push({
            label: "Delete reservation",
            icon: FiTrash2,
            onClick: () => onDelete(String(reservation.id)),
            isDestructive: true,
        });
    }

    if (onDelete && (id || actionId) && !reservation) {
        menuItems.push({
            label: actionLabel || "Archive property",
            icon: FiTrash2,
            onClick: () => onDelete(String(actionId || id)),
            isDestructive: true,
        });
    }

    return (
        <div className="flex mt-3 items-center gap-2">
            <div className="flex-1 min-w-0">
                {onEdit && id && !reservation && (
                    <Button
                        label="Manage Studio"
                        href={`/dashboard/properties/${id}`}
                        disabled={disabled}
                        size="sm"
                        className="w-full"
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
                    <>
                        {isHost && reservation.status === "CONFIRMED" && (
                            <div className="flex flex-col gap-1.5">
                                <div className="grid grid-cols-2 gap-2">
                                    <Button label="Check In" variant="success" onClick={(e) => { e?.stopPropagation(); onCheckIn?.(String(reservation.id)); }} disabled={disabled || !checkInOpen} size="sm" />
                                    <Button label="No Show" variant="outline" onClick={(e) => { e?.stopPropagation(); onNoShow?.(String(reservation.id)); }} disabled={disabled || !noShowOpen} size="sm" />
                                </div>
                                {sessionEnded && (
                                    <p className="text-[11px] text-muted-foreground">Booking time is over. It will be marked completed automatically.</p>
                                )}
                            </div>
                        )}

                        {isHost && reservation.status === "CHECKED_IN" && onComplete && (
                            <Button
                                label="Complete Session"
                                variant="success"
                                onClick={(e) => { e?.stopPropagation(); onComplete(String(reservation.id)); }}
                                disabled={disabled}
                                size="sm"
                                className="w-full"
                            />
                        )}

                        {!hostHasSessionAction && onChat && (
                            <Button
                                label={isHost ? "Chat with Client" : "Chat with Host"}
                                variant="default"
                                onClick={(e) => { e?.stopPropagation(); onChat(String(reservation.id)); }}
                                disabled={!canChat || disabled}
                                size="sm"
                                className="w-full"
                            />
                        )}
                    </>
                )}
            </div>

            {menuItems.length > 0 && (
                <div ref={menuRef} className="relative shrink-0">
                    <Button
                        icon={FiMoreVertical}
                        variant="outline"
                        size="sm"
                        aria-label="More options"
                        onClick={(e) => {
                            e?.stopPropagation();
                            setMenuOpen((prev) => !prev);
                        }}
                        disabled={disabled}
                        className="w-10 h-10 p-0 flex items-center justify-center shrink-0 cursor-pointer"
                    />

                    <AnimatePresence>
                        {isMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 4 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                transition={{ duration: 0.12 }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 bottom-full mb-1.5 min-w-48 rounded-xl bg-background/95 backdrop-blur-xl border border-border p-1 shadow-lg z-50 flex flex-col gap-0.5"
                            >
                                {menuItems.map((item, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpen(false);
                                            item.onClick();
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer",
                                            item.isDestructive
                                                ? "text-destructive hover:bg-destructive/10"
                                                : "text-foreground hover:bg-muted"
                                        )}
                                    >
                                        <item.icon size={14} className="shrink-0" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default React.memo(ListingCardActions);
