"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FaCircleInfo } from "react-icons/fa6";
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
    useTilt?: boolean;
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
    useTilt = false,
}) => {
    const [showReceipt, setShowReceipt] = useState(false);

    // 1. Memoized Data Processing
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

    const bookingStatus = reservation?.isApproved;

    const toggleReceiptModal = useCallback(() => setShowReceipt(prev => !prev), []);

    const handleCancel = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation();
            if (disabled || !actionId) return;
            onAction?.(actionId);
        },
        [onAction, actionId, disabled]
    );

    const handleSupportWhatsApp = useCallback(() => {
        const studio = reservation?.listing?.title || "the studio";
        const rid = reservation?.bookingId || "";
        const msg = `Hi ContCave team, my booking was rejected for ${studio}. Reservation ID: ${rid}. Please help with refund.`;
        openWhatsAppSupport(msg);
    }, [reservation]);

    const durationLabel = useMemo(() => {
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
    }, [reservation?.startTime, reservation?.endTime]);

    // 2. Interaction State
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);
    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!useTilt) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    const cardHref = useMemo(() => `/dashboard/bookings`, []);

    return (
        <>
            <div
                style={{ perspective: "1200px" }}
                className="group cursor-pointer select-none"
            >
                <motion.div
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{
                        rotateY: useTilt ? rotateY : 0,
                        rotateX: useTilt ? rotateX : 0,
                        transformStyle: "preserve-3d",
                    }}
                    className="flex flex-col w-full relative"
                >
                    {/* Media Container */}
                    <div className="relative mb-4 overflow-hidden rounded-2xl aspect-video bg-neutral-100 border border-black/5">
                        <Link href={cardHref} className="block h-full w-full">
                            <Image
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                                className="object-cover h-full w-full transition-transform duration-700 ease-out group-hover:scale-110"
                                src={data.imageSrc?.[0] ?? "/assets/listing-image-default.png"}
                                alt={data.title}
                            />
                        </Link>
                        {/* Soft Overlay */}
                        <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-black/5 opacity-60 pointer-events-none" />

                        {/* Status Badge */}
                        <div className="absolute left-3 top-3 z-20 transition-transform group-hover:scale-110">
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
                                className="font-bold uppercase tracking-wider text-[10px] px-3 border border-white/20 shadow-md"
                            />
                        </div>

                        {/* Pricing Backdrop */}
                        <div className="absolute bottom-3 right-3 z-20 shadow-lg">
                            <Pill
                                label={`₹${reservation?.totalPrice?.toLocaleString("en-IN")}`}
                                variant="glass"
                                size="sm"
                                className="font-bold border border-white/20"
                            />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="px-0.5">
                        <div className="mb-2 flex items-start justify-between gap-3">
                            <Link href={cardHref} className="min-w-0 flex-1">
                                <Heading
                                    title={data.title}
                                    variant="h6"
                                    className="text-[15px] leading-tight font-bold text-foreground truncate group-hover:text-primary transition-colors"
                                />
                            </Link>
                            <p className="shrink-0 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-tight">
                                {reservation?.startDate ? formatISTDate(reservation.startDate, { day: "numeric", month: "short" }) : ""} • {reservation?.startTime}
                            </p>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                {!reservation?.isApproved && onApprove ? (
                                    <Pill
                                        label="Action Required"
                                        variant="subtle"
                                        color="warning"
                                        size="xs"
                                        className="font-bold uppercase"
                                    />
                                ) : (
                                    <Pill
                                        label={`${durationLabel} Session`}
                                        variant="subtle"
                                        color="secondary"
                                        size="xs"
                                        className="font-bold uppercase tracking-tighter"
                                    />
                                )}
                            </div>

                            <button
                                onClick={toggleReceiptModal}
                                className="p-1 px-2.5 rounded-full border border-neutral-200 bg-neutral-50 hover:bg-white transition-all shadow-sm flex items-center gap-1.5"
                            >
                                <FaCircleInfo className="text-muted-foreground" size={10} />
                                <span className="text-[10px] font-bold text-foreground uppercase">Details</span>
                            </button>
                        </div>
                    </div>

                    {/* Action Toolbar */}
                    <div className="flex mt-4 gap-2">
                        {/* Approval Context */}
                        {!reservation?.isApproved && onApprove && (
                            <div className="flex gap-2 w-full">
                                <Button
                                    label="Approve Session"
                                    variant="success"
                                    classNames="flex-1 text-xs font-bold"
                                    onClick={() => onApprove(reservation?.id ?? "")}
                                    rounded
                                />
                                <Button
                                    label="Decline"
                                    variant="destructive"
                                    outline
                                    classNames="flex-1 text-xs font-bold"
                                    onClick={() => onReject?.(reservation?.id ?? "")}
                                    rounded
                                />
                            </div>
                        )}

                        {/* Chat & Status Context */}
                        {reservation && reservation?.isApproved !== 0 && (
                            <div className="flex flex-col gap-2 w-full">
                                <div className="flex gap-2 w-full">
                                    {onChat && (
                                        <Button
                                            label={onApprove ? "Chat with Client" : "Chat with Host"}
                                            onClick={() => onChat?.(reservation?.id ?? "")}
                                            disabled={bookingStatus !== 1}
                                            variant="default"
                                            classNames="flex-1 text-xs font-bold"
                                            rounded
                                        />
                                    )}
                                    {onAction && (reservation?.isApproved === 0 || reservation?.isApproved === 1) && (
                                        <Button
                                            label="Cancel"
                                            onClick={handleCancel}
                                            variant="outline"
                                            classNames="flex-1 text-xs font-bold border-destructive/20 text-destructive hover:bg-destructive/5"
                                            rounded
                                        />
                                    )}
                                    {(reservation?.isApproved === 2 || reservation?.isApproved === 3) && onDelete && (
                                        <Button
                                            label="Delete"
                                            variant="outline"
                                            onClick={() => onDelete(reservation?.id ?? "")}
                                            classNames="flex-1 text-xs font-bold border-destructive/20 text-destructive hover:bg-destructive/5"
                                            rounded
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Details Modal (Simplified for SSR best practices - ideally should be a separate component but keeping in sync for now) */}
            {showReceipt && (
                <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm flex items-center justify-center px-4 z-100" onClick={toggleReceiptModal}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background p-8 rounded-4xl w-full max-w-lg shadow-2xl ring-1 ring-black/5 relative"
                    >
                        <button
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted/50 transition-colors"
                            onClick={toggleReceiptModal}
                        >
                            <IoMdCloseCircle size={24} className="text-muted-foreground" />
                        </button>

                        <Heading title="Booking Details" subtitle={`Reservation #${reservation?.bookingId}`} className="mb-8" />

                        <div className="space-y-4">
                            {/* Status Banner */}
                            {(reservation?.isApproved === 2 || reservation?.isApproved === 3) && (
                                <div className="bg-destructive/5 border border-destructive/10 p-4 rounded-2xl mb-6">
                                    <p className="text-sm text-destructive font-medium leading-relaxed">
                                        {reservation?.isApproved === 2
                                            ? `Your booking request for ${reservation?.listing?.title} was declined by the host. Reason: "${reservation?.rejectReason || "N/A"}"`
                                            : "This reservation has been cancelled."}
                                    </p>
                                    {!onApprove && (
                                        <Button
                                            label="CONTACT SUPPORT"
                                            onClick={(e) => { e.preventDefault(); handleSupportWhatsApp(); }}
                                            icon={FaWhatsapp}
                                            variant="destructive"
                                            classNames="mt-4 w-full text-xs font-bold"
                                            rounded
                                        />
                                    )}
                                </div>
                            )}

                            {/* Data Grid */}
                            <div className="grid grid-cols-1 gap-y-4 text-sm">
                                <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-neutral-100">
                                    <span className="text-muted-foreground font-medium">Studio</span>
                                    <span className="text-foreground font-bold">{reservation?.listing?.title}</span>
                                </div>

                                <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-neutral-100">
                                    <span className="text-muted-foreground font-medium">Session Date</span>
                                    <span className="text-foreground font-bold font-mono uppercase">
                                        {reservation?.startDate ? formatISTDate(reservation.startDate, { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-neutral-100">
                                    <span className="text-muted-foreground font-medium">Time Window</span>
                                    <span className="text-foreground font-bold uppercase">
                                        {reservation?.startTime ?? ""} – {reservation?.endTime ?? ""} ({durationLabel})
                                    </span>
                                </div>

                                <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-neutral-100">
                                    <span className="text-muted-foreground font-medium">Add-ons Total</span>
                                    <span className="text-foreground font-bold">
                                        ₹{addons.reduce((acc, val) => acc + (val.qty * val.price), 0).toLocaleString("en-IN")}
                                    </span>
                                </div>

                                {snapshot?.packageTitle && (
                                    <div className="flex justify-between items-baseline pb-2 border-b border-dashed border-neutral-100">
                                        <span className="text-muted-foreground font-medium">Package Applied</span>
                                        <span className="text-primary font-bold">{snapshot.packageTitle}</span>
                                    </div>
                                )}
                            </div>

                            {/* Final Total */}
                            <div className="flex justify-between items-center mt-6 pt-6 border-t-2 border-foreground/5">
                                <span className="text-xl font-bold text-muted-foreground">Amount Paid</span>
                                <span className="text-2xl font-black text-foreground">
                                    ₹{reservation?.totalPrice?.toLocaleString("en-IN") ?? 0}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </>
    );
};

export default React.memo(BookingCard);
