"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";

import HeartButton from "@/components/HeartButton";
import Button from "@/components/ui/Button";
import StarRating from "@/components/ui/StarRating";
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

  const images = (data.imageSrc?.length > 0
    ? data.imageSrc.slice(0, 5)
    : ["/assets/listing-image-default.png"]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [hasHovered, setHasHovered] = React.useState(false);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const handleMouseEnter = () => {
    setHasHovered(true);
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2000);
  };

  const handleMouseLeave = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentIndex(0);
  };

  const price = useMemo(() => {
    if (reservation) {
      return reservation.totalPrice;
    }
    return data.price;
  }, [reservation, data.price]);

  return (
    <div className="col-span-1 cursor-pointer group p-3 rounded-2xl border border-neutral-200">
      <div className="flex flex-col gap-2 w-full">
        {/* Image area with hover slideshow */}
        <div
          className="aspect-square w-full relative overflow-hidden rounded-xl group/image"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Link
            href={onEdit ? `/properties/${data.id}` : `/listings/${data.slug}`}
            className="block h-full w-full"
          >
            <div className="relative h-full w-full">
              {images.map((src, idx) => {
                if (idx !== 0 && !hasHovered) return null;
                return (
                  <Image
                    key={idx}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover h-full w-full transition-opacity duration-500"
                    style={{ opacity: idx === currentIndex ? 1 : 0 }}
                    src={src}
                    alt={`listing image ${idx + 1}`}
                    priority={idx === 0}
                  />
                )
              })}
            </div>
          </Link>

          {/* Dot indicators — only visible on hover */}
          {images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 pointer-events-none opacity-0 group-hover/image:opacity-100 transition-opacity duration-300">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className="transition-all duration-300 rounded-full bg-background "
                  style={{
                    width: idx === currentIndex ? 16 : 6,
                    height: 6,
                    opacity: idx === currentIndex ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
          )}

          <div className="absolute top-3 right-3">
            <HeartButton listingId={data.id} currentUser={currentUser} />
          </div>
        </div>

        <Link href={onEdit ? `/properties/${data.id}` : `/listings/${data.slug}`}>
          <div className="flex justify-between items-center">
            <div className="font-semibold text-base">
              {data.title}
            </div>
            {data.avgReviewRating && data.avgReviewRating != 0 && (
              <StarRating
                rating={data.avgReviewRating}
                size={18}
                activeColor="text-yellow-500"
                showText
              />
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
                className="button rounded-full px-4 py-2 bg-foreground text-background font-semibold hover:bg-neutral-800 transition"
              >
                Manage
              </Link>
            )}

            {!reservation?.isApproved && onApprove && (
              <>
                <Button
                  label="Approve"
                  classNames="text-md font-semibold py-3 border-2 bg-green-500 border-green-500 text-background ml-2"
                  onClick={() => onApprove(reservation?.id ?? "")}
                />
                <Button
                  label="Cancel"
                  classNames="text-md font-semibold py-3 border-2 bg-destructive border-destructive text-background ml-2"
                  onClick={() => onApprove(reservation?.id ?? "")}
                />
              </>
            )}

            {reservation && reservation?.isApproved != 0 && onChat && (
              <>
                <Button
                  label="Approved"
                  classNames="text-md font-semibold py-3 border-2 bg-green-500 border-green-500 text-background ml-2"
                  onClick={() => reservation.isApproved}
                />
                <Button
                  label="Chat"
                  classNames="text-md font-semibold py-3 border-2 bg-green-500 border-green-500 text-background ml-2"
                  onClick={() => onChat(reservation?.id ?? "")}
                />
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ListingCard;
