"use client";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { FiChevronRight } from "react-icons/fi";
import Container from "@/components/Container";
import Heading from "@/components/ui/Heading";
import SectionHeader from "@/components/ui/SectionHeader";
import { studios } from "@/constants/studios";
import Button from "@/components/ui/Button";

const StudioCard = ({ studio, index }: { studio: (typeof studios)[number]; index: number }) => {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 260, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 260, damping: 22 });
  const rotateY = useTransform(springX, [-0.5, 0.5], [-12, 12]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [9, -9]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { rawX.set(0); rawY.set(0); };

  return (
    <div style={{ perspective: "900px" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 + index * 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        viewport={{ once: true }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <Link href={studio.href} className="group block">
          <div
            className="relative mb-3 overflow-hidden rounded-xl"
            style={{ aspectRatio: "4/3" }}
          >
            <Image
              src={studio.image}
              alt={studio.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            />

            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-foreground/70 text-background backdrop-blur">
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M10 3L5 9L2 6" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Verified
            </div>

            <div className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold bg-background/90 text-foreground backdrop-blur-sm">
              {studio.price}
            </div>
          </div>

          <div className="px-1">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <Heading
                title={studio.name}
                variant="h6"
                className="text-sm font-semibold leading-tight text-foreground"
              />
              <p className="shrink-0 text-xs font-medium text-muted-foreground">
                {studio.area ? `${studio.area}, ` : ""}{studio.city}
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {studio.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted/50 border border-border px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
};

const StudioShowcase = () => {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const headingY = useTransform(scrollYProgress, [0, 1], [40, -40]);
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
            isLanding
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
