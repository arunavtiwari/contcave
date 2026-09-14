"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useMemo } from "react";

import ListingCardActions from "@/components/listing/ListingCardActions";
import ListingCardContent from "@/components/listing/ListingCardContent";
import ListingCardMedia from "@/components/listing/ListingCardMedia";
import Skeleton from "@/components/ui/Skeleton";
import useCities from "@/hooks/useCities";
import { formatISTDate } from "@/lib/utils";
import {
  formatPrice,
  getDisplayTitle,
  getListingHref,
  getLocationLabel,
  normalizeImages,
} from "@/lib/utils/listing-client";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

export interface ListingCardData {
  id: string | number;
  title?: string;
  name?: string;
  imageSrc?: string | string[];
  image?: string;
  price: number | string | null;
  locationValue?: string;
  area?: string;
  city?: string | null;
  category?: string;
  tags?: string[];
  avgReviewRating?: number;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
  status?: string;
  hasSets?: boolean;
  carpetArea?: number | null;
  maximumPax?: number | null;
  listingType?: "STANDARD" | "CURATED";
  priceRangeMin?: number | null;
  priceRangeMax?: number | null;
  slug?: string | null;
  href?: string;
}

interface ListingCardProps {
  data?: ListingCardData;
  isLoading?: boolean;
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
  currentUser?: SafeUser | null;
  className?: string;
  showHeart?: boolean;
  showRating?: boolean;
  useTilt?: boolean;
  hideActions?: boolean;
  allowScale?: boolean;
  isHost?: boolean;
  priority?: boolean;
  showListingBadge?: boolean;
}

const ListingCard: React.FC<ListingCardProps> = ({
  data,
  isLoading,
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
  currentUser,
  className = "",
  showHeart = true,
  showRating = true,
  useTilt = false,
  hideActions = false,
  allowScale = true,
  isHost = false,
  priority = false,
  showListingBadge = false,
}) => {
  const { getByValue } = useCities();

  const displayTitle = useMemo(() => getDisplayTitle(data), [data]);
  const locationLabel = useMemo(() => getLocationLabel(data, getByValue), [data, getByValue]);
  const images = useMemo(() => normalizeImages(data?.imageSrc || data?.image), [data?.imageSrc, data?.image]);
  const formattedPrice = useMemo(() => formatPrice(data?.price ?? undefined, reservation), [reservation, data?.price]);
  const ratingValue = useMemo(() => data?.avgReviewRating || data?.rating, [data?.avgReviewRating, data?.rating]);
  const cardHref = useMemo(() => getListingHref(data, onEdit), [data, onEdit]);

  const reservationDate = useMemo(() =>
    reservation?.startDate ? formatISTDate(reservation.startDate, { day: "numeric", month: "short" }) : undefined
    , [reservation?.startDate]);

  const reservationTime = useMemo(() => reservation?.startTime, [reservation?.startTime]);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!useTilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width - 0.5;
    const yPct = (e.clientY - rect.top) / rect.height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (isLoading) {
    return (
      <ListingCardSkeleton
        hideActions={hideActions}
        showRating={showRating}
        isReservation={!!reservation}
        isHost={isHost}
      />
    );
  }

  return (
    <div
      style={{ perspective: "1200px" }}
      className={`group cursor-pointer select-none ${className}`}
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
        <ListingCardMedia
          images={images}
          displayTitle={displayTitle}
          cardHref={cardHref}
          isVerified={data?.status === "VERIFIED" || data?.verified}
          listingType={data?.listingType ?? "STANDARD"}
          priceRangeMin={data?.priceRangeMin ?? undefined}
          priceRangeMax={data?.priceRangeMax ?? undefined}
          formattedPrice={formattedPrice}
          hasSets={data?.hasSets}
          isReservation={!!reservation}
          showHeart={showHeart}
          listingId={String(data?.id || "")}
          currentUser={currentUser}
          onEdit={!!onEdit}
          allowScale={allowScale}
          reservationLifecycleStatus={reservation?.status}
          totalPrice={reservation?.totalPrice}
          priority={priority}
          showListingBadge={showListingBadge}
        />

        <ListingCardContent
          displayTitle={displayTitle}
          cardHref={cardHref}
          locationLabel={locationLabel}
          carpetArea={data?.carpetArea ?? undefined}
          maximumPax={data?.maximumPax ?? undefined}
          ratingValue={ratingValue}
          reviewCount={data?.reviewCount}
          showRating={showRating}
          reservationDate={reservationDate}
          reservationTime={reservationTime}
        />

        {!hideActions && (
          <ListingCardActions
            id={String(data?.id || "")}
            reservation={reservation}
            onEdit={onEdit}
            onApprove={onApprove}
            onChat={onChat}
            onDelete={onDelete}
            onCancel={onCancel}
            onReject={onReject}
            onCheckIn={onCheckIn}
            onComplete={onComplete}
            onNoShow={onNoShow}
            onExtend={onExtend}
            onAddCharge={onAddCharge}
            onShowInfo={onShowInfo}
            actionId={actionId}
            disabled={disabled}
            actionLabel={actionLabel}
            isHost={isHost}
          />
        )}
      </motion.div>
    </div>
  );
};

export interface ListingCardSkeletonProps {
  hideActions?: boolean;
  showRating?: boolean;
  isReservation?: boolean;
  isHost?: boolean;
}

export function ListingCardSkeleton({
  hideActions,
  showRating = true,
  isReservation = false,
  isHost = false,
}: ListingCardSkeletonProps) {
  return (
    <div className="flex flex-col w-full">
      {/* Media shell matches rounded-2xl aspect-4/3 mb-3 bg-neutral-100 border border-foreground/5 */}
      <div className="relative mb-3 overflow-hidden rounded-2xl aspect-4/3 bg-neutral-100 border border-foreground/5">
        <Skeleton className="w-full h-full rounded-none" />

        {/* Status Pill Skeleton (Reservation) */}
        {isReservation && (
          <div className="absolute left-3 top-3 z-20">
            <Skeleton className="h-6 w-20 rounded-full opacity-80" />
          </div>
        )}

        {/* Pricing Skeleton */}
        <div className="absolute bottom-3 right-3 z-20">
          <Skeleton className="h-7.5 w-16 rounded-full opacity-80" />
        </div>
      </div>

      <div className="px-1 pt-1 pb-1">
        {/* Chips & Location Line Row */}
        <div className="flex items-start justify-between gap-3">
          {/* Simulated Chips on the left */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-12 rounded-full" />
            {showRating && <Skeleton className="h-5 w-11 rounded-full opacity-60" />}
          </div>

          {/* Location/Date label on the right */}
          <div className="mt-2 shrink-0">
            <Skeleton className="h-3.5 w-16 rounded-md opacity-60" />
          </div>
        </div>

        {/* Title (matches Heading variant="h6" className="text-[13px] mt-2 min-h-9") */}
        <div className="mt-2.5 min-h-9">
          <Skeleton className="h-4 w-3/4 rounded-md" />
          <Skeleton className="h-4 w-1/2 rounded-md mt-1" />
        </div>

        {/* Action Buttons Row */}
        {!hideActions && (
          <div className="flex mt-3 gap-2">
            {isReservation && (
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            )}
            <div className="flex gap-2 flex-1">
              <Skeleton className="h-9 flex-1 rounded-xl" />
              {(isReservation || !hideActions) && <Skeleton className="h-9 flex-1 rounded-xl" />}
              {isReservation && isHost && <Skeleton className="h-9 flex-1 rounded-xl" />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ListingCard);
