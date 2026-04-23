"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useRef } from "react";
import { BiSearch } from "react-icons/bi";

import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { HERO_HIGHLIGHTS } from "@/constants/landing";
import useCities from "@/hooks/useCities";
import useUIStore from "@/hooks/useUIStore";
import { formatISTDate } from "@/lib/utils";

const HeroSearch = () => {
  const uiStore = useUIStore();
  const params = useSearchParams();
  const { getByValue } = useCities();

  const locationValue = params?.get("locationValue");
  const startDate = params?.get("selectedDate");

  const locationLabel = useMemo(() => {
    if (locationValue) {
      return getByValue(locationValue as string)?.label;
    }
    return null;
  }, [getByValue, locationValue]);

  const dateLabel = useMemo(() => {
    if (startDate) {
      return formatISTDate(startDate as string, {
        month: "short",
        day: "numeric",
      });
    }
    return null;
  }, [startDate]);

  return (
    <button
      type="button"
      onClick={() => uiStore.onOpen("search")}
      aria-label="Open studio search"
      className="group flex w-full max-w-lg flex-row items-center rounded-full border border-background/20 bg-background/10 backdrop-blur-2xl p-1 text-left shadow-sm transition-all active:scale-[0.98] md:max-w-xl lg:max-w-2xl"
    >
      <div className="flex flex-1 flex-row items-center divide-x divide-border/50">
        <div className="flex flex-1 flex-col px-4 md:px-7">
          <span className="text-[10px] uppercase text-background/50">
            Location
          </span>
          <span className="truncate text-sm font-medium text-background">
            {locationLabel || "Search by city..."}
          </span>
        </div>
        <div className="hidden flex-1 flex-col px-4 sm:flex md:px-7">
          <span className="text-[10px] uppercase text-background/50">
            Date
          </span>
          <span className="truncate text-sm font-medium text-background">
            {dateLabel || "Add date"}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center justify-center rounded-full bg-foreground/40 p-2 text-background transition-transform group-hover:scale-105 md:p-3 backdrop-blur-lg">
        <BiSearch size={22} />
      </div>
    </button>
  );
};

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);

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
        className="relative flex items-center h-[calc(100vh-80px)] min-h-120"
      >
        <motion.div
          className="absolute inset-0 z-50 pointer-events-none bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: [1, 1, 0] }}
          transition={{ duration: 0.65, times: [0, 0.45, 1], ease: "easeOut" }}
        />

        <motion.div
          className="absolute z-0 left-0 right-0 top-[-8%] h-[116%]"
          style={{ y: videoY }}
        >
          <video
            autoPlay
            muted
            playsInline
            onEnded={(e) => e.currentTarget.pause()}
            className="w-full h-full object-cover"
            controls={false}
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
                className="mb-2 text-xs font-medium uppercase tracking-accent text-muted/70"
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
                  className="mb-6 text-background! max-w-2xl"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.75 }}
                className="mb-6 flex flex-wrap gap-2"
              >
                {HERO_HIGHLIGHTS.map((highlight: string) => (
                  <Pill
                    key={highlight}
                    label={highlight}
                    variant="glass"
                    size="sm"
                  />
                ))}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.85 }}
                className="flex flex-col gap-6"
              >
                <div className="w-full">
                  <Suspense fallback={
                    <div className="h-16 w-full max-w-xl animate-pulse rounded-full bg-background/20 backdrop-blur-md md:max-w-2xl lg:max-w-3xl" />
                  }>
                    <HeroSearch />
                  </Suspense>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <Button
                    label="View all studios"
                    href="/home"
                    variant="outline"
                    rounded
                    fit
                    size="lg"
                  />
                </div>
              </motion.div>
            </div>
          </Container>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Hero;
