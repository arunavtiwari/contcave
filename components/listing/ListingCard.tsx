"use client";

import Image from "next/image";
import Link from "next/link";
import React, { useMemo } from "react";

import HeartButton from "@/components/HeartButton";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
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
    <div className="col-span-1 cursor-pointer group p-3 rounded-2xl bg-background shadow-sm hover:shadow-md transition-shadow">
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

          {/* Dot indicators â€” only visible on hover */}
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
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <Heading
                title={data.title}
                variant="h6"
                className="truncate"
              />
            </div>
            {data.avgReviewRating && data.avgReviewRating != 0 && (
              <StarRating
                rating={data.avgReviewRating}
                size={18}
                showText
              />
            )}
          </div>
          <div className="text-sm font-light text-muted-foreground mt-1">
            {data.category} | {location?.label}
          </div>
        </Link>

        <div className="flex flex-row items-center mt-1">
          <Pill
            label={
              <div className="flex gap-1 items-center">
                {data.hasSets && <span className="font-light opacity-70 lowercase">From</span>}
                <span>₹{price}</span>
                {!reservation && <span className="font-light opacity-70 lowercase">/ Hr</span>}
              </div>
            }
            variant="subtle"
            color="secondary"
            size="sm"
          />
        </div>

        {(onEdit || (!reservation?.isApproved && onApprove) || (reservation?.isApproved !== 0 && onChat)) && (
          <div className="flex mt-2">
            {onEdit && (
              <Button
                label="Manage"
                href={`/properties/${data.id}`}
                rounded
                fit
                classNames="text-sm font-semibold"
              />
            )}

            {!reservation?.isApproved && onApprove && (
              <div className="flex gap-2">
                <Button
                  label="Approve"
                  variant="success"
                  classNames="text-sm font-bold"
                  onClick={() => onApprove(reservation?.id ?? "")}
                  rounded
                />
                <Button
                  label="Cancel"
                  variant="danger"
                  classNames="text-sm font-bold"
                  onClick={() => onApprove(reservation?.id ?? "")}
                  rounded
                />
              </div>
            )}

            {reservation && reservation?.isApproved != 0 && onChat && (
              <div className="flex gap-2">
                <Button
                  label="Approved"
                  variant="success"
                  classNames="text-sm font-bold"
                  disabled
                  rounded
                />
                <Button
                  label="Chat"
                  variant="outline"
                  classNames="text-sm font-bold"
                  onClick={() => onChat(reservation?.id ?? "")}
                  rounded
                />
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ListingCard;

