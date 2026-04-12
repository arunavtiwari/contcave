"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import React, { useCallback, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { FaCircleInfo, FaTrashCan } from "react-icons/fa6";
import { IoMdCloseCircle } from "react-icons/io";

import Button from "@/components/ui/Button";
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

    const getStatusBanner = () => {
        if (bookingStatus == 1) {
            return "Approved";
        }
        if (bookingStatus == 0) {
            return "Pending";
        }
        if (bookingStatus == 2) {
            return "Rejected";
        }
        return "Cancelled";
    };

    const getBannerColor = () => {
        if (bookingStatus == 1) {
            return "#218C54";
        }
        if (bookingStatus == 0) {
            return "#B98A30";
        }
        return "#B53020";
    };

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
                className="relative col-span-1 border p-3 rounded-2xl"
            >
                <div className="flex flex-col gap-2 w-full">
                    <div className="aspect-square w-full relative overflow-hidden rounded-xl">

                        <Image
                            fill
                            className="object-cover h-full w-full"
                            src={data.imageSrc?.[0] ?? ""}
                            alt="listing"
                        />

                        <div
                            className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-white text-sm`}
                            style={{ backgroundColor: getBannerColor() }}
                        >
                            {getStatusBanner()}
                        </div>
                    </div>


                    <div className="font-semibold text-lg">{data.title}</div>
                    {!reservation?.isApproved && onApprove && (
                        <div className="flex items-stretch">
                            <div className="w-1/4">
                                <button
                                    className="flex items-center justify-center bg-[#4682B4] rounded-l-full h-full cursor-pointer border border-[#4682B4] text-white hover:opacity-80 transition w-full"
                                    onClick={toggleReceiptModal}
                                    aria-label="Info"
                                >
                                    <FaCircleInfo size={24} />
                                </button>
                            </div>
                            <div className="w-3/4">
                                <Button
                                    label="Approve"
                                    classNames="text-md font-semibold bg-[#27AE60] border-[#27AE60] text-white rounded-r-full"
                                    onClick={() => onApprove(reservation?.id ?? "")}
                                />
                            </div>
                        </div>

                    )}
                    {!reservation?.isApproved && onReject && (
                        <Button
                            label="Reject"
                            rounded
                            classNames="text-md font-semibold bg-[#E74C3C] text-white"
                            onClick={() => onReject(reservation?.id ?? "")}
                        />
                    )}
                    {reservation && reservation?.isApproved != 0 && onChat && (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-stretch">
                                <div className="w-1/4">
                                    <button
                                        className="flex items-center justify-center bg-[#4682B4] rounded-l-full h-full cursor-pointer border border-[#4682B4] text-white hover:opacity-80 transition w-full"
                                        onClick={toggleReceiptModal}
                                        aria-label="Info"
                                    >
                                        <FaCircleInfo size={24} />
                                    </button>
                                </div>

                                <div className="w-3/4">
                                    <Button
                                        label={onApprove ? "Message Client" : "Message Host"}
                                        onClick={() => onChat?.(reservation?.id ?? "")}
                                        disabled={bookingStatus != 1}
                                        classNames={`text-md font-semibold rounded-r-full border-black ${bookingStatus == 1
                                            ? "bg-gray-700 text-white"
                                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                            }`}
                                    />
                                </div>
                            </div>

                            {reservation && onAction && (reservation?.isApproved === 0 || reservation?.isApproved === 1) && (
                                <Button
                                    label="Cancel Reservation"
                                    onClick={handleCancel}
                                    rounded
                                    classNames="text-md font-semibold bg-white border-[#E74C3C] text-[#E74C3C]"
                                />
                            )}

                            {reservation && (reservation?.isApproved === 2 || reservation?.isApproved === 3) && onDelete && (
                                <Button
                                    icon={FaTrashCan}
                                    label="Delete"
                                    onClick={() => onDelete(reservation?.id ?? "")}
                                    rounded
                                    classNames="text-md font-semibold border-2 bg-white border-rose-500 text-rose-500"
                                />
                            )}

                        </div>)}
                </div>
            </motion.div>
            {showReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-xs md:max-w-md lg:max-w-lg">
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
                                            ? new Date(reservation.startDate).toLocaleDateString()
                                            : "—"}
                                        {reservation?.startTime ? `, ${reservation.startTime}` : ""}
                                        {" "}was rejected by the host.
                                    </p>
                                )}
                                {reservation?.isApproved === 2 && reservation?.rejectReason && (
                                    <div>
                                        <div>Reason Provided:</div>
                                        <div>“{reservation.rejectReason}”</div>
                                    </div>
                                )}
                                {!onApprove && (
                                    <div className="space-y-3">
                                        {reservation?.isApproved === 2 && (
                                            <p>
                                                Don’t worry! Your payment will be refunded as per our policy. We’ll help you with your refund right away. Tap the button below to connect with our team on WhatsApp.
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
                                <span className="text-gray-700 font-medium">Reservation ID:</span>
                                <span className="text-gray-900 font-bold">#{reservation?.bookingId}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Property:</span>
                                <span className="text-gray-900">{reservation?.listing?.title}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Date of Booking:</span>
                                <span className="text-gray-900">
                                    {reservation?.startDate
                                        ? new Date(reservation.startDate).toLocaleDateString()
                                        : "—"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Time:</span>
                                <span className="text-gray-900">
                                    {reservation?.startTime ?? ""} – {reservation?.endTime ?? ""}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Duration:</span>
                                <span className="text-gray-900">
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
                                <span className="text-gray-700 font-medium">Add-ons:</span>
                                {<span className="text-gray-900">
                                    {addons
                                        .map((item: Addon) => item.name)
                                        .join(", ") || "None"}
                                </span>}
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Add-ons Charge:</span>
                                <span className="text-gray-900 font-semibold">
                                    ₹ {addons.reduce(
                                        (acc: number, value: Addon) => acc + value.qty * value.price,
                                        0
                                    )}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Property Charge:</span>
                                <span className="text-gray-900 font-semibold">
                                    ₹ {(reservation?.totalPrice ?? 0) -
                                        addons.reduce(
                                            (acc: number, value: Addon) => acc + value.qty * value.price,
                                            0
                                        )}
                                </span>
                            </div>

                            {snapshot?.packageTitle && (
                                <div className="flex justify-between">
                                    <span className="text-gray-700 font-medium">Package:</span>
                                    <span className="text-gray-900">{snapshot.packageTitle}</span>
                                </div>
                            )}

                            {(snapshot?.includedSetName || (snapshot?.additionalSets && snapshot.additionalSets.length > 0)) && (
                                <div className="flex flex-col gap-1 pt-1">
                                    <span className="text-gray-700 font-medium">Booked Sets:</span>
                                    <div className="flex flex-wrap gap-2">
                                        {snapshot.includedSetName && (
                                            <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-xs rounded-md border border-neutral-200">
                                                {snapshot.includedSetName}
                                            </span>
                                        )}
                                        {snapshot.additionalSets?.map((s) => (
                                            <span key={s.id} className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-xs rounded-md border border-neutral-200">
                                                {s.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-4 border-t pt-4">
                            <span className="text-lg font-bold text-gray-700">Total:</span>
                            <span className="text-lg font-bold text-gray-900">
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
