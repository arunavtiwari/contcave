"use client";

import { motion } from "framer-motion";
import { BsPatchCheckFill } from "react-icons/bs";

import Container from "@/components/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import StarRating from "@/components/ui/StarRating";
import { reviews } from "@/constants/testimonials";

interface ReviewCardProps {
  review: (typeof reviews)[number];
}

const ReviewCard = ({ review }: ReviewCardProps) => (
  <div className="relative shrink-0 rounded-2xl p-5 bg-background border border-border transition-all duration-300">
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
    <p className="mb-4 line-clamp-3 text-sm leading-relaxed italic text-foreground/80">
      &ldquo;{review.quote}&rdquo;
    </p>
    <StarRating
      rating={5}
      size={11}
    />
  </div>
);

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
                poster="/images/features/book_studio.jpeg"
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
                <span className="rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-accent text-background backdrop-blur-md bg-background/10">
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
            className="flex min-w-0 flex-1 flex-col gap-5"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {reviews.map((review, i) => (
                <ReviewCard key={i} review={review} />
              ))}
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default SocialProof;
