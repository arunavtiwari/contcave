"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import Container from "@/components/layout/Container";
import SpotlightTrigger from "@/components/search/SpotlightTrigger";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { HERO_HIGHLIGHTS } from "@/constants/landing";

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // The server can't know the motion preference, so scroll effects only attach after mount.
  const scrollMotion = isMounted && !prefersReducedMotion;

  const { scrollYProgress } = useScroll({
    target: isMounted ? containerRef : undefined,
    offset: ["start start", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.92]);
  const borderRadius = useTransform(scrollYProgress, [0, 0.4], ["0rem", "1.5rem"]);

  const videoY = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-5%"]);

  return (
    <motion.div
      ref={containerRef}
      style={scrollMotion ? { scale, borderRadius } : undefined}
      className="relative overflow-hidden"
    >
      <div
        className="relative flex items-center h-[calc(100vh-80px)] min-h-120"
      >
        <motion.div
          className="absolute z-0 left-0 right-0 top-[-8%] h-[116%]"
          style={scrollMotion ? { y: videoY } : undefined}
        >
          <video
            autoPlay
            muted
            playsInline
            preload="metadata"
            poster="/videos/hero-bg-poster.webp"
            className="w-full h-full object-cover"
            controls={false}
          >
            <source
              src="/videos/hero-bg.mp4"
              type="video/mp4"
            />
          </video>
        </motion.div>

        <div className="absolute inset-0 z-10 bg-linear-to-br from-foreground/50 to-foreground/90" />

        <motion.div
          style={scrollMotion ? { y: contentY } : undefined}
          className="relative z-20 w-full"
        >
          <Container>
            <div className="w-full">
              <p
                className="mb-2 text-xs font-medium uppercase tracking-widest text-muted/70"
              >
                For Agencies, Brands and Creators
              </p>

              <Heading
                title="Book your next shoot location"
                variant="h1"
                className="mb-6 text-background! max-w-2xl"
              />

              <div className="mb-6 flex flex-wrap gap-2">
                {HERO_HIGHLIGHTS.map((highlight: string) => (
                  // Animated per pill: opacity on a parent stops the glass blur from rendering.
                  <Pill
                    key={highlight}
                    label={highlight}
                    variant="glass"
                    size="sm"
                    className="animate-hero-rise motion-reduce:animate-none"
                  />
                ))}
              </div>

              <div className="flex flex-col gap-6">
                <div className="w-full">
                  <SpotlightTrigger tone="glass" />
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Button
                    label="View all studios"
                    href="/studios"
                    variant="outline"
                    rounded
                    fit
                    size="lg"
                  />
                </div>
              </div>
            </div>
          </Container>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Hero;
