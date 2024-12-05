"use client";

import useCities from "@/hook/useCities";
import { SafeReservation, SafeUser, safeListing } from "@/types";
import { format } from "date-fns";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useMemo } from "react";
import Button from "../Button";
import HeartButton from "../HeartButton";

type Props = {
  data: safeListing;
  reservation?: SafeReservation;
  onAction?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onChat?: (id: string) => void;
  onApproveBookings?: (id: string) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser?: SafeUser | null;
};

function ListingCard({
  data,
  reservation,
  onAction,
  onEdit,
  onDelete,
  onApprove,
  onChat,
  disabled,
  actionLabel,
  actionId = "",
  onApproveBookings,
  currentUser,
}: Props) {
  const router = useRouter();
  const { getByValue } = useCities();

  const location = getByValue(data.locationValue);

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.8,
        delay: 0.5,
        ease: [0, 0.71, 0.2, 1.01],
      }}
      onClick={() => onEdit ? router.push(`/properties/${data.id}`) : router.push(`/listings/${data.id}`)}
      className="col-span-1 cursor-pointer group p-5 shadow-solid-6 rounded-2xl"
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="aspect-square w-full relative overflow-hidden rounded-xl">
          <Image
            fill
            className="object-cover h-full w-full group-hover:scale-110 transition"
            src={data.imageSrc[0] || "/assets/listing-image-default.png"}
            alt="listing"
          />
          <div className="absolute top-3 right-3">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>
        </div>
        <div className="font-semibold text-lg">
          {data.title}
        </div>
        <div className="font-light text-neutral-500">
          {data.category} | {location?.label}
        </div>
        <div className="flex flex-row items-center">
          <div className="flex gap-1 font-semibold">
            ₹{price} {!reservation && <div className="font-light">/ Hour</div>}
          </div>
        </div>
        <div className="flex mt-2">
          {onEdit && (
            <Button
              label="Manage"
              onClick={() => onEdit(data.id)}
            />
          )}
          {/* {onDelete && (
            <Button
              label="Delete"
              classNames="outline"
              onClick={() => onDelete(data.id)}
            />
          )} */}
          {!reservation?.isApproved && onApprove && (
            <Button
              label="Approve"
              classNames="text-md font-semibold py-3 border-2  bg-green-500 border-green-500 text-white ml-2"
              onClick={() => onApprove(reservation?.id ?? "")}
            />
          )}
          {!reservation?.isApproved && onApprove && (
            <Button
              label="Cancel"
              classNames="text-md font-semibold py-3 border-2  bg-rose-500 border-rose-500 text-white ml-2"
              onClick={() => onApprove(reservation?.id ?? "")}
            />
          )}
          {reservation && reservation?.isApproved != 0 && onChat && (
            <>
              <Button
                label="Approved"
                classNames="text-md font-semibold py-3 border-2  bg-green-500 border-green-500 text-white ml-2"
                onClick={() => reservation.isApproved}
              />
              <Button
                label="Chat"
                classNames="text-md font-semibold py-3 border-2  bg-green-500 border-green-500 text-white ml-2"
                onClick={() => onChat(reservation?.id ?? "")}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ListingCard;
