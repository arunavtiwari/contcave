"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { useRef } from "react";
import { FiChevronRight } from "react-icons/fi";

import Container from "@/components/Container";
import ListingCard from "@/components/listing/ListingCard";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { studios } from "@/constants/studios";

const StudioCard = ({ studio, index }: { studio: (typeof studios)[number]; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 + index * 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      viewport={{ once: true }}
    >
      <ListingCard data={studio} showHeart={false} useTilt={true} />
    </motion.div>
  );
};

const StudioShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const decoY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section ref={sectionRef} id="features" className="relative overflow-hidden py-section">
      <motion.p
        aria-hidden="true"
        style={{ y: decoY }}
        className="pointer-events-none absolute right-[-2%] top-6 select-none font-foreground leading-none"
      >
        <span
          className="text-transparent opacity-5"
          style={{
            fontSize: "clamp(80px, 14vw, 160px)",
            letterSpacing: "-0.04em",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
            WebkitTextStroke: "1.5px var(--color-foreground)",
          }}
        >
          STUDIOS
        </span>
      </motion.p>

      <Container>
        <div className="mb-8 flex items-end justify-between">
          <SectionHeader
            badge="Explore spaces"
            title="Studios on ContCave"
            className="mb-0!"
          />
          <Button
            label="View all studios"
            href="/home"
            variant="outline"
            rounded
            fit
            classNames="hidden md:flex"
            icon={FiChevronRight}
          />
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio, i) => (
            <StudioCard key={studio.id} studio={studio} index={i} />
          ))}
        </div>

        <div className="mt-10 text-center md:hidden">
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-75"
          >
            Explore all spaces
            <FiChevronRight size={16} />
          </Link>
        </div>
      </Container>
    </section>
  );
};

export default StudioShowcase;

