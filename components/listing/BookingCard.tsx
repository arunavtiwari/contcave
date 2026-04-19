"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import React, { useCallback, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FaCircleInfo, FaTrashCan } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";

import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { formatISTDate } from "@/lib/utils";
import { openWhatsAppSupport } from "@/lib/whatsapp/whatsappSupport";
import { Addon } from "@/types/addon";
import { safeListing } from "@/types/listing";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

interface PricingSnapshot {
    packageTitle?: string;
    includedSetName?: string;
    additionalSets?: Array<{ id: string; name: string }>;
}

interface BookingCardProps {
    data: safeListing;
    reservation?: SafeReservation;
    onAction?: (id: string) => void;
    onEdit?: (id: string) => void;
    onDelete?: (id: string) => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
    onChat?: (id: string) => void;
    disabled?: boolean;
    actionLabel?: string;
    actionId?: string;
    currentUser?: SafeUser | null;
}

const BookingCard: React.FC<BookingCardProps> = ({
    data,
    reservation,
    onAction,
    onDelete,
    onApprove,
    onReject,
    onChat,
    disabled,
    actionId,
}) => {
    const [showReceipt, setShowReceipt] = useState(false);

    const addons = useMemo(() =>
        Array.isArray(reservation?.selectedAddons)
            ? (reservation.selectedAddons as unknown as Addon[])
            : [],
        [reservation?.selectedAddons]
    );

    const snapshot = useMemo(() =>
        reservation?.pricingSnapshot
            ? (reservation.pricingSnapshot as unknown as PricingSnapshot)
            : undefined,
        [reservation?.pricingSnapshot]
    );

    const handleCancel = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (disabled || !actionId) return;
            onAction?.(actionId);
        },
        [onAction, actionId, disabled]
    );

    const bookingStatus = reservation?.isApproved;

    const toggleReceiptModal = () => setShowReceipt(!showReceipt);

    const handleSupportWhatsApp = () => {
        const studio = reservation?.listing?.title || "the studio";
        const rid = reservation?.bookingId || "";
        const msg = `Hi ContCave team, my booking was rejected for ${studio}. Reservation ID: ${rid}. Please help with refund.`;
        openWhatsAppSupport(msg);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                    duration: 0.8,
                    delay: 0.5,
                    ease: [0, 0.71, 0.2, 1.01],
                }}
                className="relative col-span-1 bg-background shadow-sm hover:shadow-md transition-shadow p-3 rounded-2xl"
            >
                <div className="flex flex-col gap-2 w-full">
                    <div className="aspect-square w-full relative overflow-hidden rounded-xl">

                        <Image
                            fill
                            className="object-cover h-full w-full transition-transform duration-500 group-hover:scale-105"
                            src={data.imageSrc?.[0] ?? ""}
                            alt={data.title}
                        />

                        <div className="absolute top-3 right-3 z-20">
                            <Pill
                                label={
                                    bookingStatus === 1 ? "Approved" :
                                        bookingStatus === 0 ? "Pending" :
                                            bookingStatus === 2 ? "Rejected" : "Cancelled"
                                }
                                variant="glass"
                                color={
                                    bookingStatus === 1 ? "success" :
                                        bookingStatus === 0 ? "warning" : "destructive"
                                }
                                size="xs"
                            />
                        </div>
                    </div>


                    <div className="flex flex-col gap-1">
                        <Heading
                            title={data.title}
                            variant="h6"
                        />
                        <div className="flex flex-wrap gap-2">
                            {!reservation?.isApproved && onApprove ? (
                                <Pill label="Pending Approval" variant="subtle" color="warning" size="xs" />
                            ) : reservation?.isApproved ? (
                                <Pill label="Management Approved" variant="subtle" color="success" size="xs" />
                            ) : (
                                <Pill label="Pending Payment" variant="subtle" color="neutral" size="xs" />
                            )}
                        </div>
                    </div>
                    {!reservation?.isApproved && onApprove && (
                        <div className="flex items-stretch gap-0 mt-3">
                            <div className="w-1/4">
                                <button
                                    className="flex items-center justify-center bg-muted/50 rounded-l-xl h-full cursor-pointer border border-border border-r-0 text-foreground hover:bg-muted transition w-full"
                                    onClick={toggleReceiptModal}
                                    aria-label="Info"
                                >
                                    <FaCircleInfo size={20} className="text-muted-foreground" />
                                </button>
                            </div>
                            <div className="w-3/4">
                                <Button
                                    label="Approve"
                                    size="sm"
                                    classNames="w-full text-sm font-semibold bg-foreground text-background rounded-l-none rounded-r-xl border-l-0"
                                    onClick={() => onApprove(reservation?.id ?? "")}
                                />
                            </div>
                        </div>
                    )}
                    {!reservation?.isApproved && onReject && (
                        <Button
                            label="Reject"
                            rounded
                            classNames="text-md font-semibold bg-destructive text-background"
                            onClick={() => onReject(reservation?.id ?? "")}
                        />
                    )}
                    {reservation && reservation?.isApproved != 0 && onChat && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-stretch">
                                <div className="w-1/4">
                                    <button
                                        className="flex items-center justify-center bg-muted/50 rounded-l-xl h-full cursor-pointer border border-border border-r-0 text-foreground hover:bg-muted transition w-full"
                                        onClick={toggleReceiptModal}
                                        aria-label="Info"
                                    >
                                        <FaCircleInfo size={20} className="text-muted-foreground" />
                                    </button>
                                </div>

                                <div className="w-3/4">
                                    <Button
                                        label={onApprove ? "Message Client" : "Message Host"}
                                        onClick={() => onChat?.(reservation?.id ?? "")}
                                        disabled={bookingStatus != 1}
                                        size="sm"
                                        classNames={`w-full text-sm font-semibold rounded-l-none rounded-r-xl border-l-0 ${bookingStatus == 1
                                            ? "bg-foreground text-background"
                                            : "bg-muted text-muted-foreground cursor-not-allowed border-muted"
                                            }`}
                                    />
                                </div>
                            </div>

                            {reservation && onAction && (reservation?.isApproved === 0 || reservation?.isApproved === 1) && (
                                <Button
                                    label="Cancel Reservation"
                                    onClick={handleCancel}
                                    rounded
                                    classNames="text-md font-semibold bg-background border-destructive! text-destructive!"
                                />
                            )}

                            {reservation && (reservation?.isApproved === 2 || reservation?.isApproved === 3) && onDelete && (
                                <Button
                                    icon={FaTrashCan}
                                    label="Delete"
                                    onClick={() => onDelete(reservation?.id ?? "")}
                                    rounded
                                    classNames="text-md font-semibold border-2 bg-background border-destructive text-destructive"
                                />
                            )}

                        </div>)}
                </div>
            </motion.div>
            {showReceipt && (
                <div className="fixed inset-0 bg-foreground bg-opacity-50 flex items-center justify-center px-4 z-50">
                    <div className="bg-background p-6 rounded-xl w-full max-w-xs md:max-w-md lg:max-w-lg">
                        <div className="flex items-center mb-5">
                            <button
                                className="hover:opacity-80 transition absolute"
                                onClick={toggleReceiptModal}
                            >
                                <IoMdCloseCircle size={24} />
                            </button>
                            <h2 className="text-xl font-semibold text-center w-full">Booking Details</h2>
                        </div>

                        {(reservation?.isApproved === 2 || reservation?.isApproved === 3) && (
                            <div className="mb-4 space-y-3">
                                {reservation?.isApproved === 2 && (
                                    <p>
                                        Unfortunately, your booking request for {reservation?.listing?.title} on
                                        {" "}
                                        {reservation?.startDate
                                            ? formatISTDate(reservation.startDate, {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })
                                            : "—"}
                                        {reservation?.startTime ? `, ${reservation.startTime}` : ""}
                                        {" "}was rejected by the host.
                                    </p>
                                )}
                                {reservation?.isApproved === 2 && reservation?.rejectReason && (
                                    <div>
                                        <div>Reason Provided:</div>
                                        <div>â€œ{reservation.rejectReason}â€</div>
                                    </div>
                                )}
                                {!onApprove && (
                                    <div className="space-y-3">
                                        {reservation?.isApproved === 2 && (
                                            <p>
                                                Don't worry! Your payment will be refunded as per our policy. We'll help you with your refund right away. Tap the button below to connect with our team on WhatsApp.
                                            </p>
                                        )}
                                        {reservation?.isApproved === 3 && (
                                            <p>
                                                Need help with your refund? Tap below to connect with our support team on WhatsApp.
                                            </p>
                                        )}
                                        <Button
                                            label="CONTACT SUPPORT ON WHATSAPP"
                                            onClick={(e) => { e.preventDefault(); handleSupportWhatsApp(); }}
                                            icon={FaWhatsapp}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Reservation ID:</span>
                                <span className="text-foreground font-bold">#{reservation?.bookingId}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Property:</span>
                                <span className="text-foreground">{reservation?.listing?.title}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Date of Booking:</span>
                                <span className="text-foreground">
                                    {reservation?.startDate
                                        ? formatISTDate(reservation.startDate, {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric"
                                        })
                                        : "â€”"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Time:</span>
                                <span className="text-foreground">
                                    {reservation?.startTime ?? ""} – {reservation?.endTime ?? ""}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Duration:</span>
                                <span className="text-foreground">
                                    {(() => {
                                        const parse12h = (s: string | undefined): number | null => {
                                            if (!s) return null;
                                            const m = s.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
                                            if (!m) return null;
                                            let h = parseInt(m[1], 10);
                                            const min = parseInt(m[2], 10);
                                            const ampm = m[3].toUpperCase();
                                            if (ampm === "PM" && h !== 12) h += 12;
                                            if (ampm === "AM" && h === 12) h = 0;
                                            return h * 60 + min;
                                        };
                                        const startStr = reservation?.startTime as string | undefined;
                                        const endStr = reservation?.endTime as string | undefined;
                                        const startMin = parse12h(startStr);
                                        const endMin = parse12h(endStr);
                                        if (startMin == null || endMin == null) return "-";
                                        let diff = endMin - startMin;
                                        if (diff < 0) diff += 24 * 60;
                                        const hours = Math.floor(diff / 60);
                                        const minutes = diff % 60;
                                        return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
                                    })()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Add-ons:</span>
                                {<span className="text-foreground">
                                    {addons
                                        .map((item: Addon) => item.name)
                                        .join(", ") || "None"}
                                </span>}
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Add-ons Charge:</span>
                                <span className="text-foreground font-semibold">
                                    ₹ {addons.reduce(
                                        (acc: number, value: Addon) => acc + value.qty * value.price,
                                        0
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-muted-foreground font-medium">Property Charge:</span>
                                <span className="text-foreground font-semibold">
                                    ₹ {(reservation?.totalPrice ?? 0) -
                                        addons.reduce(
                                            (acc: number, value: Addon) => acc + value.qty * value.price,
                                            0
                                        )}
                                </span>
                            </div>

                            {snapshot?.packageTitle && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Package:</span>
                                    <span className="text-foreground">{snapshot.packageTitle}</span>
                                </div>
                            )}

                            {(snapshot?.includedSetName || (snapshot?.additionalSets && snapshot.additionalSets.length > 0)) && (
                                <div className="flex flex-col gap-1 pt-1">
                                    <span className="text-muted-foreground font-medium">Booked Sets:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {snapshot.includedSetName && (
                                            <Pill
                                                label={snapshot.includedSetName}
                                                variant="subtle"
                                                size="xs"
                                            />
                                        )}
                                        {snapshot.additionalSets?.map((s) => (
                                            <Pill
                                                key={s.id}
                                                label={s.name}
                                                variant="subtle"
                                                size="xs"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-4 border-t pt-4">
                            <span className="text-lg font-bold text-muted-foreground">Total:</span>
                            <span className="text-lg font-bold text-foreground">
                                ₹ {reservation?.totalPrice ?? 0}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default BookingCard;

