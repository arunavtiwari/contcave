"use client";
import { motion } from "framer-motion";
import Image from "next/image";

import Container from "@/components/Container";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-black py-28 lg:py-36">
      {/* Background Image with Overlay */}
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
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-t from-black via-black/40 to-black/20" />
      </motion.div>

      <Container>
        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-xs font-medium uppercase tracking-accent"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Our story
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-8 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-7xl"
          >
            Building the infrastructure <br /> for creative spaces.
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <a
              href="/home"
              className="inline-block rounded-full bg-white px-8 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:scale-105"
            >
              Explore Spaces
            </a>
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default Hero;
