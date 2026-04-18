"use client";
import { motion } from "framer-motion";
import Image from "next/image";

import Container from "@/components/Container";
import Heading from "@/components/ui/Heading";
import Button from "@/components/ui/Button";

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-foreground py-28 lg:py-36">
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
        <div className="absolute inset-0 bg-linear-to-t from-foreground via-foreground/40 to-foreground/20" />
      </motion.div>

      <Container>
        <div className="relative z-10 flex flex-col items-center text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4 text-xs font-medium uppercase tracking-accent text-background/65"
          >
            Our story
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mb-8"
          >
            <Heading
              title="Building the infrastructure for creative spaces."
              variant="h1"
              isLanding
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <Button
              label="Explore Spaces"
              href="/home"
              variant="default"
              rounded
              fit
              size="lg"
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
};

export default Hero;
