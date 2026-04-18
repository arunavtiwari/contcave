"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { BiSearch } from "react-icons/bi";

import Container from "@/components/Container";
import useSearchModal from "@/hook/useSearchModal";

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchModal = useSearchModal();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.92]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.4], ["0rem", "1.5rem"]);

  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-5%"]);

  return (
    <motion.div
      ref={containerRef}
      style={{ scale, borderRadius }}
      className="overflow-hidden"
    >
      <div
        className="relative flex items-center"
        style={{ height: "calc(100vh - 80px)", minHeight: 480 }}
      >
        <motion.div
          className="absolute inset-0 z-50 pointer-events-none"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: 0.65, times: [0, 0.45, 1], ease: "easeOut" }}
          style={{ backgroundColor: "var(--color-background)" }}
        />

        <motion.div
          className="absolute z-0 left-0 right-0"
          style={{ y: videoY, top: "-8%", height: "116%" }}
        >
          <video
            autoPlay
            muted
            playsInline
            onEnded={(e) => e.currentTarget.pause()}
            className="w-full h-full object-cover"
          >
            <source
              src={`${process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL}/static/hero-bg.mp4`}
              type="video/mp4"
            />
          </video>
        </motion.div>

        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(160deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.88) 100%)",
          }}
        />

        <motion.div
          className="absolute left-0 top-0 bottom-0 w-0.75 z-20"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.9, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ backgroundColor: "var(--color-primary)", transformOrigin: "top" }}
        />

        <motion.div
          style={{ y: contentY }}
          className="relative z-20 w-full"
        >
          <Container>
            <div className="w-full">
              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.55 }}
                className="mb-4 text-xs font-medium uppercase tracking-accent"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                For Agencies, Brands and Creators
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.65 }}
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(2rem, 5vw, 4.2rem)",
                  fontWeight: 900,
                  lineHeight: 1.05,
                  color: "#FAF7F2",
                  marginBottom: "0.5rem",
                }}
              >
                Book your next shoot location
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.75 }}
                className="mb-6"
                style={{
                  fontSize: "clamp(0.9rem, 1.6vw, 1.1rem)",
                  color: "rgba(255,255,255,0.6)",
                  letterSpacing: "0.01em",
                }}
              >
                Verified studios · Instant booking · Transparent pricing
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.85 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={searchModal.onOpen}
                  className="flex items-center gap-3 rounded-full transition hover:opacity-90"
                  style={{
                    backgroundColor: "#FFFFFF",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
                    padding: "10px 10px 10px 20px",
                  }}
                >
                  <span className="text-sm font-medium text-gray-500">
                    Search by city…
                  </span>
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--color-primary)", padding: "8px" }}
                  >
                    <BiSearch size={15} color="#FFFFFF" />
                  </span>
                </button>

                <Link
                  href="/home"
                  className="inline-block rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-80"
                  style={{
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  View all studios
                </Link>
              </motion.div>
            </div>
          </Container>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Hero;
