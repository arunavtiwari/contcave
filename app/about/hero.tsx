"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const Hero = () => {
  return (
    <div
      className="relative overflow-hidden"
      style={{ height: "60vh", minHeight: 480 }}
    >
      <motion.div
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/images/hero/hero_banner.png"
          alt="ContCave — Creator infrastructure for India"
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(26,23,20,0.35) 0%, rgba(26,23,20,0.88) 100%)",
        }}
      />

      {/* Black left accent — brand signature */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 w-[3px]"
        style={{ backgroundColor: "#000000" }}
      />

      <div className="relative z-10 flex h-full flex-col justify-end px-8 pb-16 md:px-16 lg:px-20">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-xs font-medium uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Our story
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(2rem, 4.5vw, 3.8rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              color: "#FAF7F2",
              marginBottom: "1.5rem",
            }}
          >
            Building the infrastructure{" "}
            <em style={{ color: "#ffffff" }}>
              India&apos;s creators actually need.
            </em>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <a
              href="/home"
              className="inline-block rounded-full px-7 py-3 text-base font-semibold transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: "#000000", color: "#fff" }}
            >
              Find a studio
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
