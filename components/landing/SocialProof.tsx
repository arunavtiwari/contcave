"use client";

import { motion } from "framer-motion";

import Container from "@/components/Container";
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
        <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" className="text-muted-foreground/40">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
    <p className="mb-4 line-clamp-3 text-sm leading-relaxed italic text-foreground/80">
      &ldquo;{review.quote}&rdquo;
    </p>
    <StarRating
      rating={5}
      size={11}
      activeColor="text-amber-500"
    />
  </div>
);

const SocialProof = () => {
  return (
    <section className="py-section bg-muted/30">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-accent text-muted-foreground/60">
            Real shoots · Real reviews
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
            Real shoots, real spaces.
          </h2>
        </motion.div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="w-full lg:w-85 lg:shrink-0">
            <div
              className="relative overflow-hidden rounded-2xl aspect-9/16 max-h-120"
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
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 28%, transparent 55%, rgba(0,0,0,0.78) 100%)",
                }}
              />
              <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-accent text-white"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
                >
                  Real Shoots via ContCave
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                <p className="text-sm font-semibold leading-tight text-white">
                  Creative Studio
                </p>
                <p className="mt-0.5 text-xs text-white/60">
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
