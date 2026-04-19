"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React, { useMemo, useRef, useState } from "react";
import { AiFillStar } from "react-icons/ai";
import { MdVerified } from "react-icons/md";

import HeartButton from "@/components/HeartButton";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import useCities from "@/hook/useCities";
import { SafeReservation } from "@/types/reservation";
import { SafeUser } from "@/types/user";

/**
 * Enterprise-grade data contract for ListingCard.
 * Supports both platform core listings and landing page showcase data.
 */
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
  data: ListingCardData;
  reservation?: SafeReservation;
  onEdit?: (id: string) => void;
  onApprove?: (id: string) => void;
  onChat?: (id: string) => void;
  onDelete?: (id: string) => void;
  actionId?: string;
  disabled?: boolean;
  actionLabel?: string;
  currentUser?: SafeUser | null;
  className?: string;
  showHeart?: boolean;
  showRating?: boolean;
  useTilt?: boolean;
}

const ListingCard: React.FC<ListingCardProps> = ({
  data,
  reservation,
  onEdit,
  onApprove,
  onChat,
  onDelete,
  actionId,
  disabled,
  actionLabel,
  currentUser,
  className = "",
  showHeart = true,
  showRating = true,
}) => {
  const { getByValue } = useCities();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideshowInterval = useRef<NodeJS.Timeout | null>(null);

  // 1. Memoized Data Processing
  const displayTitle = useMemo(() => data.title || data.name || "Untitled Space", [data.title, data.name]);

  const locationLabel = useMemo(() => {
    if (data.locationValue) return getByValue(data.locationValue)?.label;
    if (data.area) return `${data.area}, ${data.city}`;
    return data.city || "Location Pending";
  }, [data.locationValue, data.area, data.city, getByValue]);

  const images = useMemo(() => {
    const raw = data.imageSrc || data.image;
    if (Array.isArray(raw)) return raw.length > 0 ? raw.slice(0, 5) : ["/assets/listing-image-default.png"];
    if (typeof raw === "string") return [raw];
    return ["/assets/listing-image-default.png"];
  }, [data.imageSrc, data.image]);

  const formattedPrice = useMemo(() => {
    if (reservation) return reservation.totalPrice;
    const p = typeof data.price === "number" ? data.price : Number(String(data.price).replace(/[^\d]/g, ""));
    return isNaN(p) ? 0 : p;
  }, [reservation, data.price]);

  const ratingValue = useMemo(() => data.avgReviewRating || data.rating, [data.avgReviewRating, data.rating]);
  const cardHref = useMemo(() => data.href || (onEdit ? `/dashboard/properties/${data.id}` : `/listings/${data.slug || data.id}`), [data.href, onEdit, data.id, data.slug]);

  // 2. Interaction State
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
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

  const handleMouseEnter = () => {
    if (images.length <= 1) return;
    slideshowInterval.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 2200);
  };

  const handleMouseLeave = () => {
    if (images.length > 1 && slideshowInterval.current) {
      clearInterval(slideshowInterval.current);
      slideshowInterval.current = null;
    }
    setCurrentIndex(0);
    x.set(0);
    y.set(0);
  };

  return (
    <div
      style={{ perspective: "1200px" }}
      className={`group cursor-pointer select-none ${className}`}
    >
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
        }}
        className="flex flex-col w-full relative"
      >
        {/* Media Container */}
        <div
          className="relative mb-4 overflow-hidden rounded-2xl aspect-video bg-neutral-100 border border-black/5"
          onMouseEnter={handleMouseEnter}
        >
          <Link href={cardHref} className="block h-full w-full">
            <Image
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover h-full w-full transition-transform duration-700 ease-out group-hover:scale-110"
              src={images[currentIndex]}
              alt={displayTitle}
              priority={false}
            />
            {/* Soft Overlay for readability */}
            <div className="absolute inset-0 bg-linear-to-t from-black/20 via-transparent to-black/5 opacity-60 pointer-events-none" />
          </Link>

          {/* Verification Badge */}
          {(data.status === "VERIFIED" || data.verified) && (
            <div className="absolute left-3 top-3 z-20 p-1.5 rounded-full bg-white/90 backdrop-blur-md border border-white/50 shadow-sm transition-transform group-hover:scale-110">
              <MdVerified className="text-[#1d9bf0]" size={15} />
            </div>
          )}

          {/* Pricing Backdrop */}
          <Pill
            label={
              <div className="flex gap-1 items-center font-medium">
                {data.hasSets && <span className="text-[10px] opacity-70">From</span>}
                <span className="text-sm">₹{formattedPrice.toLocaleString("en-IN")}</span>
                {!reservation && <span className="text-[10px] opacity-70">/ Hr</span>}
              </div>
            }
            variant="glass"
            size="sm"
            className="absolute bottom-3 right-3 z-20 shadow-lg border border-white/20"
          />

          {!onEdit && showHeart && (
            <div className="absolute top-3 right-3 z-30 transition-transform hover:scale-110 active:scale-90">
              <HeartButton listingId={String(data.id)} currentUser={currentUser} />
            </div>
          )}

          {/* Slideshow Progress Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300">
              {images.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${i === currentIndex ? "bg-white w-4" : "bg-white/40 w-1"
                    }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="px-0.5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <Link href={cardHref} className="min-w-0 flex-1">
              <Heading
                title={displayTitle}
                variant="h6"
                className="text-[15px] leading-tight font-bold text-foreground truncate group-hover:text-primary transition-colors"
              />
            </Link>
            <p className="shrink-0 text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-wider">
              {locationLabel}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-bold text-muted-foreground/90 transition-colors group-hover:bg-neutral-100">
              {data.category || (data.tags && data.tags[0]) || "Creative Space"}
            </span>

            {ratingValue && showRating && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 group-hover:bg-white transition-all shadow-sm">
                <AiFillStar className="text-warning" size={12} />
                <span className="text-[11px] font-extrabold text-foreground">
                  {ratingValue.toFixed(1)}
                  {data.reviewCount !== undefined && data.reviewCount > 0 && (
                    <span className="font-medium text-muted-foreground opacity-60 ml-0.5 tracking-tighter">
                      ({data.reviewCount})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Toolbar (Dynamic Context) */}
        {(onEdit || onDelete || (!reservation?.isApproved && onApprove) || (reservation?.isApproved !== 0 && onChat)) && (
          <div className="flex mt-4 pt-1 gap-2">
            {onEdit && (
              <Button
                label="Manage Studio"
                href={`/properties/${data.id}`}
                rounded
                classNames="text-xs font-bold flex-1"
                disabled={disabled}
              />
            )}

            {onDelete && (
              <Button
                label={actionLabel || "Delete"}
                variant="outline"
                rounded
                classNames="text-xs font-bold flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(String(actionId || data.id));
                }}
                disabled={disabled}
              />
            )}

            {!reservation?.isApproved && onApprove && (
              <div className="flex gap-2 w-full">
                <Button
                  label="Approve"
                  variant="success"
                  classNames="text-xs font-bold flex-1"
                  onClick={() => onApprove(String(reservation?.id))}
                  rounded
                />
                <Button
                  label="Decline"
                  variant="destructive"
                  classNames="text-xs font-bold flex-1"
                  onClick={() => onApprove(String(reservation?.id))}
                  rounded
                />
              </div>
            )}

            {reservation && reservation?.isApproved !== 0 && onChat && (
              <div className="flex gap-2 w-full">
                <Button
                  label="Session Approved"
                  variant="success"
                  classNames="text-xs font-bold flex-1 cursor-default"
                  disabled
                  rounded
                />
                <Button
                  label="Message Host"
                  variant="outline"
                  classNames="text-xs font-bold flex-1"
                  onClick={() => onChat(String(reservation?.id))}
                  rounded
                />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default React.memo(ListingCard);

