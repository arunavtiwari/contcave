"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useMemo } from "react";

import useCities from "@/hooks/useCities";
import {
  formatPrice,
  getDisplayTitle,
  getListingHref,
  getLocationLabel,
  normalizeImages,
} from "@/lib/utils/listing-client";
import { formatISTDate } from "@/lib/utils";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

import ListingCardActions from "@/components/listing/ListingCardActions";
import ListingCardContent from "@/components/listing/ListingCardContent";
import ListingCardMedia from "@/components/listing/ListingCardMedia";
import ListingCardSkeleton from "@/components/listing/ListingCardSkeleton";

export interface ListingCardData {
  id: string | number;
  title?: string;
  name?: string;
  imageSrc?: string | string[];
  image?: string;
  price: number | string;
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
}) => {
  const { getByValue } = useCities();

  // 1. Memoized Normalized Data
  const displayTitle = useMemo(() => getDisplayTitle(data), [data]);
  const locationLabel = useMemo(() => getLocationLabel(data, getByValue), [data, getByValue]);
  const images = useMemo(() => normalizeImages(data?.imageSrc || data?.image), [data?.imageSrc, data?.image]);
  const formattedPrice = useMemo(() => formatPrice(data?.price, reservation), [reservation, data?.price]);
  const ratingValue = useMemo(() => data?.avgReviewRating || data?.rating, [data?.avgReviewRating, data?.rating]);
  const cardHref = useMemo(() => getListingHref(data, onEdit), [data, onEdit]);

  const reservationDate = useMemo(() =>
    reservation?.startDate ? formatISTDate(reservation.startDate, { day: "numeric", month: "short" }) : undefined
    , [reservation?.startDate]);

  const reservationTime = useMemo(() => reservation?.startTime, [reservation?.startTime]);

  // 2. Interaction State (Tilt)
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
    const hasRatingData = data ? (data.avgReviewRating != null || data.rating != null) : false;
    return (
      <ListingCardSkeleton
        hideActions={hideActions}
        showRating={showRating && hasRatingData}
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
          formattedPrice={formattedPrice}
          hasSets={data?.hasSets}
          isReservation={!!reservation}
          showHeart={showHeart}
          listingId={String(data?.id || "")}
          currentUser={currentUser}
          onEdit={!!onEdit}
          allowScale={allowScale}
          reservationStatus={reservation?.isApproved ?? undefined}
          totalPrice={reservation?.totalPrice}
        />

        <ListingCardContent
          displayTitle={displayTitle}
          cardHref={cardHref}
          locationLabel={locationLabel}
          category={data?.category || (data?.tags && data.tags[0])}
          ratingValue={ratingValue}
          reviewCount={data?.reviewCount}
          showRating={showRating}
          reservationDate={reservationDate}
          reservationTime={reservationTime}
          reservation={reservation}
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

export default React.memo(ListingCard);


