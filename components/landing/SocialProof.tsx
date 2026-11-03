"use client";

import "swiper/css";
import "swiper/css/navigation";

import { motion } from "framer-motion";
import { useState } from "react";
import { BsPatchCheckFill } from "react-icons/bs";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import Container from "@/components/layout/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import StarRating from "@/components/ui/StarRating";
import { reviews } from "@/constants/testimonials";

const REVIEWS_PER_PAGE = 4;

function chunk<T>(items: T[], size: number): T[][] {
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(items.slice(i, i + size));
  }
  return pages;
}

interface ReviewCardProps {
  review: (typeof reviews)[number];
}

const QUOTE_TRUNCATE_LENGTH = 180;

const ReviewCard = ({ review }: ReviewCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.quote.length > QUOTE_TRUNCATE_LENGTH;

  return (
    <div className="relative flex shrink-0 flex-col rounded-2xl p-5 bg-background border border-border transition-all duration-300">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold bg-muted text-foreground">
          {review.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">
            {review.name}
          </p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground/60">
            {review.role}
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <BsPatchCheckFill className="text-foreground" size={16} />
        </div>
      </div>
      <p
        className={`mb-2 whitespace-pre-line text-sm leading-relaxed italic text-foreground/80 ${
          expanded ? "" : "line-clamp-3"
        }`}
      >
        &ldquo;{review.quote}&rdquo;
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mb-4 w-fit text-xs font-semibold text-foreground underline underline-offset-2 hover:text-foreground/70"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
      {!isLong && <div className="mb-4" />}
      <div className="mt-auto">
        <StarRating
          rating={5}
          size={11}
        />
      </div>
    </div>
  );
};

const SocialProof = () => {
  return (
    <section className="py-section bg-muted/30">
      <Container>
        <SectionHeader
          badge="Real shoots · Real reviews"
          title="Real shoots, real spaces."
        />

        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="w-full lg:w-85 lg:shrink-0">
            <div
              className="relative overflow-hidden rounded-3xl aspect-9/16 max-h-120 shadow-sm"
            >
              <video
                src="/videos/shoot_1.mp4"
                poster="/videos/shoot_1-poster.webp"
                autoPlay
                muted
                loop
                playsInline
                controls={false}
                disablePictureInPicture
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-foreground/42 via-transparent to-foreground/78" />
              <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-center">
                <span className="rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-background backdrop-blur-md bg-background/10">
                  Shoots via ContCave
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-10 p-5 backdrop-blur-sm bg-background/10 text-center">
                <p className="text-sm font-semibold leading-tight text-background">
                  Creative Studio
                </p>
                <p className="mt-0.5 text-xs text-background/60">
                  Transport Nagar · Lucknow
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Reviews column */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="min-w-0 flex-1"
          >
            <Swiper
              modules={[Navigation]}
              navigation={{ nextEl: ".reviews-next", prevEl: ".reviews-prev" }}
              slidesPerView={1}
            >
              {chunk(reviews, REVIEWS_PER_PAGE).map((page, i) => (
                <SwiperSlide key={i}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {page.map((review, j) => (
                      <ReviewCard key={j} review={review} />
                    ))}
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>

            {reviews.length > REVIEWS_PER_PAGE && (
              <div className="mt-5 flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Previous reviews"
                  className="reviews-prev flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background [&.swiper-button-disabled]:pointer-events-none [&.swiper-button-disabled]:opacity-30"
                >
                  <FiChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  aria-label="Next reviews"
                  className="reviews-next flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-foreground transition hover:bg-background [&.swiper-button-disabled]:pointer-events-none [&.swiper-button-disabled]:opacity-30"
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default SocialProof;
