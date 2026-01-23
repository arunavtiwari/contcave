"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";
import { FaStar } from "react-icons/fa6";

import Button from "@/components/Button";
import HeartButton from "@/components/HeartButton";
import useCities from "@/hook/useCities";
import { safeListing } from "@/types/listing";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

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

const ListingCard: React.FC<Props> = ({
  data,
  reservation,
  onEdit,
  onApprove,
  onChat,
  currentUser
}) => {

  const { getByValue } = useCities();
  const location = getByValue(data.locationValue);



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
      className="col-span-1 cursor-pointer group p-5 shadow-sm rounded-2xl border border-neutral-200"
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="aspect-square w-full relative overflow-hidden rounded-xl">
          <Link href={onEdit ? `/properties/${data.id}` : `/listings/${data.id}`}>
            <Image
              fill
              className="object-cover h-full w-full group-hover:scale-110 transition-transform duration-700"
              src={data.imageSrc[0] || "/assets/listing-image-default.png"}
              alt="listing"
            />
          </Link>
          <div className="absolute top-3 right-3">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>
        </div>
        <Link href={onEdit ? `/properties/${data.id}` : `/listings/${data.id}`}>
          <div className="flex justify-between items-center">
            <div className="font-semibold text-lg">
              {data.title}
            </div>
            {data.avgReviewRating && data.avgReviewRating != 0 && (
              <div className="font-semibold text-md flex items-center gap-1.5">
                <FaStar size={18} color="gold" /> {data.avgReviewRating?.toFixed(1)}
              </div>
            )}

          </div>
          <div className="font-light text-neutral-500">
            {data.category} | {location?.label}
          </div>
        </Link>
        <div className="flex flex-row items-center">
          <div className="flex gap-1 font-semibold">
            {data.hasSets && <span className="font-light text-neutral-500 mr-1">Starting from</span>}
            ₹{price} {!reservation && <div className="font-light">/ Hour</div>}
          </div>
        </div>

        {(onEdit || (!reservation?.isApproved && onApprove) || (reservation?.isApproved !== 0 && onChat)) && (
          <div className="flex mt-2">
            {onEdit && (
              <Link
                href={`/properties/${data.id}`}
                className="button rounded-full px-4 py-2 bg-black text-white font-semibold hover:bg-neutral-800 transition"
              >
                Manage
              </Link>
            )}

            {!reservation?.isApproved && onApprove && (
              <>
                <Button
                  label="Approve"
                  classNames="text-md font-semibold py-3 border-2 bg-green-500 border-green-500 text-white ml-2"
                  onClick={() => onApprove(reservation?.id ?? "")}
                />
                <Button
                  label="Cancel"
                  classNames="text-md font-semibold py-3 border-2 bg-rose-500 border-rose-500 text-white ml-2"
                  onClick={() => onApprove(reservation?.id ?? "")}
                />
              </>
            )}

            {reservation && reservation?.isApproved != 0 && onChat && (
              <>
                <Button
                  label="Approved"
                  classNames="text-md font-semibold py-3 border-2 bg-green-500 border-green-500 text-white ml-2"
                  onClick={() => reservation.isApproved}
                />
                <Button
                  label="Chat"
                  classNames="text-md font-semibold py-3 border-2 bg-green-500 border-green-500 text-white ml-2"
                  onClick={() => onChat(reservation?.id ?? "")}
                />
              </>
            )}
          </div>
        )}

      </div>
    </motion.div>
  );
}

export default ListingCard;
