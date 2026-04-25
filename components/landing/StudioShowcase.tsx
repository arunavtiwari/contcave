"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { memo, useRef } from "react";
import { FiChevronRight } from "react-icons/fi";

import Container from "@/components/Container";
import ListingCard from "@/components/listing/ListingCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { FullListing } from "@/types/listing";

interface StudioShowcaseProps {
  listings: FullListing[];
}

const StudioCard = memo(({ studio, index }: { studio: FullListing; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay: index * 0.15,
        ease: [0.21, 0.45, 0.32, 0.9]
      }}
      viewport={{ once: true, margin: "-50px" }}
      className="h-full"
    >
      <ListingCard data={studio} showHeart={false} useTilt={true} allowScale={true} />
    </motion.div>
  );
});

StudioCard.displayName = "StudioCard";

const StudioShowcase: React.FC<StudioShowcaseProps> = ({ listings }) => {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const decoY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  if (!listings || listings.length === 0) return null;

  return (
    <section ref={sectionRef} id="features" className="relative overflow-hidden py-section">
      <motion.p
        aria-hidden="true"
        style={{ y: decoY }}
        className="pointer-events-none absolute right-[-2%] top-12 select-none font-foreground leading-none"
      >
        <span
          className="text-transparent opacity-5"
          style={{
            fontSize: "clamp(100px, 16vw, 200px)",
            letterSpacing: "-0.06em",
            fontFamily: "var(--font-geist-sans), sans-serif",
            fontWeight: 800,
            lineHeight: 1,
            WebkitTextStroke: "2px var(--color-foreground)",
          }}
        >
          STUDIOS
        </span>
      </motion.p>

      <Container>
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SectionHeader
            badge="Exclusive Collection"
            title="Studios on ContCave"
            className="mb-0!"
          />
          <Button
            label="Explore all studios"
            href="/home"
            variant="outline"
            outline
            rounded
            fit
            className="hidden md:flex group"
            icon={FiChevronRight}
          />
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {listings.slice(0, 3).map((studio, i) => (
            <StudioCard key={studio.id} studio={studio} index={i} />
          ))}
        </div>

        <div className="mt-12 text-center md:hidden">
          <Button
            label="View all studios"
            href="/home"
            variant="outline"
            outline
            rounded
            fit
            className="mx-auto"
            icon={FiChevronRight}
          />
        </div>
      </Container>
    </section>
  );
};

export default memo(StudioShowcase);

