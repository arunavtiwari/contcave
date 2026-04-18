"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { BiSearch } from "react-icons/bi";

import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
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
          className="absolute inset-0 z-50 pointer-events-none bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: 0.65, times: [0, 0.45, 1], ease: "easeOut" }}
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

        <div className="absolute inset-0 z-10 bg-linear-to-br from-foreground/50 to-foreground/90" />

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
                className="mb-4 text-xs font-medium uppercase tracking-accent text-background/55"
              >
                For Agencies, Brands and Creators
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.65 }}
              >
                <Heading
                  title="Book your next shoot location"
                  variant="h1"
                  isLanding
                  className="mb-2"
                />
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.75 }}
                className="mb-6 text-background/60"
                style={{
                  fontSize: "clamp(0.9rem, 1.6vw, 1.1rem)",
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
                  className="flex items-center gap-3 rounded-full transition hover:opacity-90 bg-background shadow-foreground/25 p-2.5 pl-5"
                >
                  <span className="text-sm font-medium text-muted-foreground">
                    Search by city…
                  </span>
                  <span
                    className="flex items-center justify-center rounded-full bg-primary p-2"
                  >
                    <BiSearch size={15} className="text-background" />
                  </span>
                </button>

                <Button
                  label="View all studios"
                  href="/home"
                  variant="outline"
                  size="lg"
                  rounded
                  fit
                />
              </motion.div>
            </div>
          </Container>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Hero;
