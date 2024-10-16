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

    // Determine Price
    const price = useMemo(() => {
        if (reservation) {
            return reservation.totalPrice;
        }
        return data.price;
    }, [reservation, data.price]);

    // Determine Booking Status
    const bookingStatus = reservation?.isApproved; // Assuming `status` can be 'approved', 'pending', or 'cancelled'

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
            return "bg-green-500";
        }
        if (bookingStatus == 0) {
            return "bg-yellow-500";
        }
        return "bg-red-500";
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
                className="relative col-span-1 cursor-pointer group"
            >
                <div className="flex flex-col gap-2 w-full">
                    <div className="aspect-square w-full relative overflow-hidden rounded-xl">
                        {/* Property Image */}
                        <Image
                            fill
                            className="object-cover h-full w-full group-hover:scale-110 transition"
                            src={data.imageSrc?.[0] ?? ""}
                            alt="listing"
                        />
                        {/* Status Banner */}
                        <div
                            className={`absolute top-3 right-3 px-3 py-1 rounded-lg text-white text-sm font-semibold ${getBannerColor()}`}
                        >
                            {getStatusBanner()}
                        </div>
                    </div>

                    {/* Property Title */}
                    <div className="font-semibold text-lg">{data.title}</div>
                    <div className="font-light text-neutral-500">
                        {data.category} | {location?.label}
                    </div>

                    <div className="flex flex-row items-center">
                        <div className="flex gap-1 font-semibold">
                            ₹{price} {!reservation && <div className="font-light"> / Hour</div>}
                        </div>
                    </div>
                    {!reservation?.isApproved && onApprove && (
                        <Button
                            label="Approve"
                            classNames="text-md font-semibold py-3 border-2  bg-green-500 border-green-500 text-white ml-2"
                            onClick={() => onApprove(reservation?.id ?? "")}
                        />
                    )}
                    {!reservation?.isApproved && onReject && (
                        <Button
                            label="Reject"
                            classNames="text-md font-semibold py-3 border-2  bg-rose-500 border-rose-500 text-white ml-2"
                            onClick={() => onReject(reservation?.id ?? "")}
                        />
                    )}
                    {reservation && reservation?.isApproved != 0 && onChat && (
                        <div className="flex flex-col gap-2">
                            {/* Row for 'i' button and 'Message the Host' button */}
                            <div className="flex items-center gap-2">
                                {/* "i" Button */}
                                <div className="w-1/4">
                                    <div className="flex items-center p-4 justify-center bg-rose-500 h-full rounded-md">
                                        <IconButton
                                            icon={<FaCircleInfo />}
                                            aria-label="Info"
                                            size="lg"
                                            className="p-0 w-full h-full"
                                            color="white"
                                            onClick={toggleReceiptModal}
                                        />
                                    </div>
                                </div>

                                {/* Message the Host Button */}
                                <div className="w-3/4">
                                    <Button
                                        label={onApprove ? "Message Client" : "Message the Host"}
                                        onClick={() => onChat?.(reservation?.id ?? "")}
                                        disabled={bookingStatus != 1} // Disable if not approved
                                        classNames={`text-md font-semibold py-3 border-2 ${bookingStatus == 1
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
                                    classNames="text-md font-semibold py-3 border-2 bg-white border-rose-500 text-rose-500"
                                />
                            )}

                            {reservation && (reservation?.isApproved === 2 || reservation?.isApproved === 3) && onDelete && (
                                <Button
                                    icon={FaTrashCan}
                                    label="Delete"
                                    onClick={() => onDelete(reservation?.id ?? "")}
                                    classNames="text-md font-semibold py-3 border-2 bg-white border-rose-500 text-rose-500"
                                />
                            )}

                        </div>)}
                </div>
            </motion.div>
            {showReceipt && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50">
                    <div className="bg-white p-6 rounded-lg w-full max-w-xs md:max-w-md lg:max-w-lg">
                        <h2 className="text-xl font-semibold mb-4">Booking Details</h2>

                        <p className="mb-2">
                            <strong>Property:</strong> {reservation?.listing?.title}
                        </p>

                        <p className="mb-2">
                            <strong>Date of Booking:</strong> {new Date(booking?.startDate).toLocaleDateString()}
                        </p>

                        <p className="mb-2">
                            <strong>Time:</strong> {new Date(booking?.startTime).toLocaleTimeString()} - {new Date(booking?.endTime).toLocaleTimeString()}
                        </p>

                        <p className="mb-2">
                            <strong>Duration:</strong>{" "}
                            {(() => {
                                const startTime = new Date(booking?.startTime);
                                const endTime = new Date(booking?.endTime);
                                const durationInMs = endTime.getTime() - startTime.getTime();
                                const durationInHours = durationInMs / (1000 * 60 * 60);
                                return `${durationInHours} hours`;
                            })()}
                        </p>

                        <p className="mb-2">
                            <strong>Add-ons:</strong>{" "}
                            {
                                booking?.selectedAddons.map((item) => item.name).join(", ") || "None"
                            }
                        </p>
                        <p className="mb-2">
                            <strong>Add-ons Charge:</strong> <span>₹ {booking?.selectedAddons.reduce((acc, value) => acc + (value.qty * value.price), 0)}</span>
                        </p>
                        <p className="mb-2">
                            <strong>Property Charge:</strong> <span>₹ {booking?.totalPrice - booking?.selectedAddons.reduce((acc, value) => acc + (value.qty * value.price), 0)}</span>
                        </p>


                        <p className="mt-4 text-lg">
                            <strong>Total:</strong> ₹ {reservation?.totalPrice ?? 0}
                        </p>

                        <div className="mt-4 flex justify-end">
                            <Button
                                label="Close"
                                onClick={toggleReceiptModal}
                                classNames="text-md font-semibold py-3 bg-gray-300 text-black"
                            />
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default BookingCard;
