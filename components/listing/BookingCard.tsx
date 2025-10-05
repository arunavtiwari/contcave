"use client";
import useCities from "@/hook/useCities";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo, useState, useEffect } from "react";
import Button from "../Button";
import { FaCircleInfo, FaTrashCan } from "react-icons/fa6";
import { IconButton } from "@chakra-ui/button";
import { IoMdCloseCircle } from "react-icons/io";

type Props = {
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
};

function BookingCard({
    data,
    reservation,
    onAction,
    onChat,
    onApprove,
    onReject,
    onDelete,
    disabled,
    actionId = "",
}: Props) {
    const router = useRouter();
    const { getByValue } = useCities();
    const [booking, setBooking] = useState<any>();
    const location = getByValue(data.locationValue);
    const [showReceipt, setShowReceipt] = useState(false);

    useEffect(() => {
        const fetchReservation = async () => {
            const reservation_data = await fetch(`/api/reservations/${reservation?.id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            setBooking(await reservation_data.json());
        };

        fetchReservation();
    }, [reservation?.id]);

    const handleCancel = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            if (disabled) return;
            onAction?.(actionId);
        },
        [onAction, actionId, disabled]
    );

    const price = useMemo(() => {
        if (reservation) {
            return reservation.totalPrice;
        }
        return data.price;
    }, [reservation, data.price]);

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
                className="relative col-span-1 border p-5 rounded-xl"
            >
                <div className="flex flex-col gap-2 w-full">
                    <div className="aspect-square w-full relative overflow-hidden rounded-xl">
                        {/* Property Image */}
                        <Image
                            fill
                            className="object-cover h-full w-full"
                            src={data.imageSrc?.[0] ?? ""}
                            alt="listing"
                        />
                        {/* Status Banner */}
                        <div
                            className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-white text-sm`}
                            style={{ backgroundColor: getBannerColor() }}
                        >
                            {getStatusBanner()}
                        </div>
                    </div>

                    {/* Property Title */}
                    <div className="font-semibold text-lg">{data.title}</div>
                    {!reservation?.isApproved && onApprove && (
                        <div className="flex items-stretch">
                            <div className="w-1/4">
                                <div className="lex items-center justify-center bg-[#4682B4] rounded-l-full h-full cursor-pointer border border-[#4682B4]" onClick={toggleReceiptModal}>
                                    <IconButton
                                        icon={<FaCircleInfo />}
                                        aria-label="Info"
                                        size="xl"
                                        className="p-0 w-full h-full"
                                        color="white"
                                    />
                                </div>
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
                                    <div className="flex items-center justify-center bg-[#4682B4] rounded-l-full h-full cursor-pointer border border-[#4682B4]" onClick={toggleReceiptModal}>
                                        <IconButton
                                            icon={<FaCircleInfo />}
                                            aria-label="Info"
                                            size="xl"
                                            className="p-0 w-full h-full"
                                            color="white"
                                        />
                                    </div>
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

                            {reservation && (reservation?.isApproved === 0 || reservation?.isApproved === 1) && (
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

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Property:</span>
                                <span className="text-gray-900">{reservation?.listing?.title}</span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Date of Booking:</span>
                                <span className="text-gray-900">
                                    {new Date(booking?.startDate).toLocaleDateString()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Time:</span>
                                <span className="text-gray-900">
                                    {new Date(booking?.startTime).toLocaleTimeString()} – {new Date(booking?.endTime).toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Duration:</span>
                                <span className="text-gray-900">
                                    {(() => {
                                        const startTime = new Date(booking?.startTime);
                                        const endTime = new Date(booking?.endTime);
                                        const durationInMs = endTime.getTime() - startTime.getTime();
                                        const durationInHours = durationInMs / (1000 * 60 * 60);
                                        return `${durationInHours} hours`;
                                    })()}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Add-ons:</span>
                                <span className="text-gray-900">
                                    {booking?.selectedAddons.map((item) => item.name).join(", ") || "None"}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Add-ons Charge:</span>
                                <span className="text-gray-900 font-semibold">
                                    ₹ {booking?.selectedAddons.reduce((acc, value) => acc + (value.qty * value.price), 0)}
                                </span>
                            </div>

                            <div className="flex justify-between">
                                <span className="text-gray-700 font-medium">Property Charge:</span>
                                <span className="text-gray-900 font-semibold">
                                    ₹ {booking?.totalPrice - booking?.selectedAddons.reduce((acc, value) => acc + (value.qty * value.price), 0)}
                                </span>
                            </div>
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
