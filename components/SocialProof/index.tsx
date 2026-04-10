"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";



const clips = [
  {
    src: "/videos/shoot_1.mp4",      
    poster: "/images/features/book_studio.jpeg", 
    studioName: "Creative Studio ",
    subtitle: "Transport Nagar · Lucknow",
    reviewIndex: 0,
  },
  // {
  //   src: "/videos/clip-podcast.mp4",
  //   poster: "/images/features/studio.png",
  //   studioName: "The Sound Room",
  //   subtitle: "Sector 62 · Noida",
  //   reviewIndex: 1,
  // },
  // {
  //   src: "/videos/clip-fashion.mp4",
  //   poster: "/images/features/collaborate.png",
  //   studioName: "Studio Lumière",
  //   subtitle: "Noida",
  //   reviewIndex: 2,
  // },
];

const reviews = [
  {
    quote:
      "We did product shoot for our upcoming collection. It was a great experience, finding studio with ContCave",
    name: "Cosmoksha",
    role: "Owner · Product Shoot",
    initials: "CM",
    clipIndex: 0,
    
  },
  {
    quote:
      "Professional podcast setup without the overhead. Everything we needed for our launch episode.",
    name: "Rohit Raj",
    role: "Founder · Podcast Recording",
    initials: "RR",
    clipIndex: 1,

  },
  // {
  //   quote:
  //     "Found a cyclorama studio on short notice. Listing was accurate, booking took minutes. No surprises.",
  //   name: "Riya Sharma",
  //   role: "Fashion Photographer · Delhi",
  //   initials: "RS",
  //   clipIndex: 2,
  
  // },
  {
    quote:
      "Our agency books studios through ContCave every month. Cuts scouting time from days to minutes.",
    name: "Abhinav",
    role: "Founder · Agency",
    initials: "AV",
    clipIndex: 3

  },
  {
    quote:
      "Recieved quality clients than anything we got through social media.",
    name: "Aman",
    role: "Studio Owner · Lucknow",
    initials: "AM",

  },
];

const CLIP_DURATION = 10000; 


interface ReviewCardProps {
  review: (typeof reviews)[number];
  isActive: boolean;
  cardRef: React.RefCallback<HTMLDivElement>;
  onClick: () => void;
}

const ReviewCard = ({ review, isActive, cardRef, onClick }: ReviewCardProps) => (
  <motion.div
    ref={cardRef}
    onClick={onClick}
    animate={{ scale: isActive ? 1.03 : 1 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="relative flex-shrink-0 cursor-pointer rounded-2xl p-5"
    style={{
      width: "296px",
      backgroundColor: "#FFFFFF",
      border: isActive ? "1.5px solid #111111" : "1px solid rgba(17,17,17,0.09)",
      boxShadow: isActive
        ? "0 6px 24px rgba(17,17,17,0.1)"
        : "0 1px 4px rgba(17,17,17,0.04)",
      transition: "border-color 0.3s, box-shadow 0.3s",
      scrollSnapAlign: "start",
    }}
  >

    <div className="mb-4 flex items-center gap-3">
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{
          backgroundColor: isActive ? "#111111" : "rgba(17,17,17,0.08)",
          color: isActive ? "#FFFFFF" : "#111111",
          transition: "background-color 0.3s, color 0.3s",
        }}
      >
        {review.initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight" style={{ color: "#111111" }}>
          {review.name}
        </p>
        <p
          className="mt-0.5 truncate text-[11px] leading-tight"
          style={{ color: "rgba(17,17,17,0.45)" }}
        >
          {review.role}
        </p>
      </div>
      
        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 20 20" fill="rgba(17,17,17,0.4)">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
    </div>

    <p
      className="mb-4 line-clamp-3 text-sm leading-relaxed"
      style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: "italic",
        color: "#333333",
      }}
    >
      &ldquo;{review.quote}&rdquo;
    </p>

    {/* Stars */}
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          width="11"
          height="11"
          viewBox="0 0 14 14"
          fill={isActive ? "#111111" : "#CCCCCC"}
          style={{ transition: "fill 0.3s" }}
        >
          <path d="M7 1l1.545 3.13 3.455.502-2.5 2.436.59 3.44L7 8.885l-3.09 1.623.59-3.44L2 4.632l3.455-.502z" />
        </svg>
      ))}
    </div>
  </motion.div>
);

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */

const SocialProof = () => {
  const [activeClip, setActiveClip] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [cycleKey, setCycleKey] = useState(0);

  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Auto-cycle clips — resets when cycleKey changes (manual nav)
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setActiveClip((p) => (p + 1) % clips.length);
    }, CLIP_DURATION);
    return () => clearInterval(id);
  }, [isPaused, cycleKey]);

  // Play active video, pause others
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === activeClip) {
        v.currentTime = 0;
        v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  }, [activeClip]);

  // Scroll matching review card into center
  useEffect(() => {
    const idx = clips[activeClip]?.reviewIndex ?? -1;
    const card = cardRefs.current[idx];
    const container = scrollRef.current;
    if (!card || !container) return;
    const target = card.offsetLeft - container.offsetWidth / 2 + card.offsetWidth / 2;
    container.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeClip]);

  const activeReviewIdx = clips[activeClip]?.reviewIndex ?? -1;

  const goToClip = (i: number) => {
    setActiveClip(i);
    setCycleKey((k) => k + 1);
  };

  return (
    <section className="py-12 lg:py-16" style={{ backgroundColor: "#F8F8F8" }}>
      {/* Hide scrollbar cross-browser */}
      <style>{`.cc-scroll::-webkit-scrollbar{display:none}`}</style>

      <div className="mx-auto max-w-[1280px] px-4 md:px-10 xl:px-20">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(17,17,17,0.45)" }}
          >
            Real shoots · Real reviews
          </p>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
              fontWeight: 700,
              color: "#111111",
              lineHeight: 1.2,
            }}
          >
            Real shoots, real spaces.
          </h2>
        </motion.div>

        {/* ── Main 1fr + 2fr layout ── */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

          {/* ── LEFT: Video column (9:16) ── */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="w-full lg:w-[340px] lg:flex-shrink-0"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className="relative overflow-hidden rounded-2xl"
              style={{ aspectRatio: "9/16", maxHeight: "480px" }}
            >
              {/* Stacked videos — cross-fade via opacity */}
              {clips.map((clip, i) => (
                <video
                  key={i}
                  ref={(el) => { videoRefs.current[i] = el; }}
                  src={clip.src}
                  poster={clip.poster}
                  muted={isMuted}
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    opacity: activeClip === i ? 1 : 0,
                    transition: "opacity 0.7s ease-in-out",
                  }}
                />
              ))}

              {/* Gradient overlay */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 28%, transparent 55%, rgba(0,0,0,0.78) 100%)",
                }}
              />

              {/* Top: label + mute toggle */}
              <div className="absolute left-4 right-4 top-4 z-10 flex items-center justify-between">
                <span
                  className="rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
                >
                  Real Shoots via ContCave
                </span>

                <button
                  onClick={() => setIsMuted((m) => !m)}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-75"
                  style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                  {isMuted ? (
                    /* Muted icon */
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    /* Unmuted icon */
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Bottom: studio name + dots */}
              <div className="absolute bottom-0 left-0 right-0 z-10 p-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeClip}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p className="text-sm font-semibold leading-tight text-white">
                      {clips[activeClip].studioName}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {clips[activeClip].subtitle}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Pill dots */}
                <div className="mt-3 flex items-center gap-1.5">
                  {clips.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => goToClip(i)}
                      aria-label={`Go to clip ${i + 1}`}
                      style={{
                        height: "3px",
                        borderRadius: "2px",
                        width: activeClip === i ? "20px" : "6px",
                        backgroundColor:
                          activeClip === i ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        transition: "width 0.35s ease, background-color 0.35s ease",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Reviews column ── */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            viewport={{ once: true }}
            className="flex min-w-0 flex-1 flex-col gap-5"
          >
            {/* 2-row grid: 3 cards top, 2 + arrow bottom */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {reviews.slice(0, 3).map((review, i) => (
                <ReviewCard
                  key={i}
                  review={review}
                  isActive={i === activeReviewIdx}
                  cardRef={(el) => { cardRefs.current[i] = el; }}
                  onClick={() => {
                    if (review.clipIndex !== undefined) goToClip(review.clipIndex);
                  }}
                />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {reviews.slice(3).map((review, i) => (
                <ReviewCard
                  key={i + 3}
                  review={review}
                  isActive={i + 3 === activeReviewIdx}
                  cardRef={(el) => { cardRefs.current[i + 3] = el; }}
                  onClick={() => {
                    if (review.clipIndex !== undefined) goToClip(review.clipIndex);
                  }}
                />
              ))}
              {/* Arrow card — "View more" */}
              <div
                className="hidden xl:flex items-center justify-center rounded-2xl"
                style={{
                  border: "1px dashed rgba(17,17,17,0.12)",
                  minHeight: "160px",
                }}
              >
                <Link
                  href="/home"
                  className="flex flex-col items-center gap-2 text-center"
                  style={{ color: "rgba(17,17,17,0.4)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                  </svg>
                  <span className="text-xs font-medium uppercase tracking-[0.14em]">View all studios</span>
                </Link>
              </div>
            </div>

            

          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
