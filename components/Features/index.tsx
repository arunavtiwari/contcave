"use client";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const studios = [
  {
    id: 1,
    name: "Spacious Natural Light Studio",
    city: "Delhi",
    area: "Mayapuri",
    price: "₹2000/hr",
    tags: ["Product Shoot", "Cyclorama", "Natural Light"],
    image: "/images/features/studio.png",
    href: "/listings/spacious-natural-light-photo-film-studio",
  },
  {
    id: 2,
    name: "Luxury Creative Studio",
    city: "Punjab",
    area: "Mohali",
    price: "₹2,500/hr",
    tags: ["Podcast", "Product Shoot", "Lifestyle"],
    image: "/images/features/book_studio.jpeg",
    href: "/listings/luxury-creative-studio-in-mohali-with-styled-lifestyle-sets",
  },
  {
    id: 3,
    name: "Lifestyle Studio",
    city: "Gurugram",
    area: "Sector 18",
    price: "₹2,000/hr",
    tags: ["Fashion", "Lifestyle", "Product"],
    image: "/images/features/collaborate.png",
    href: "/home",
  },
];


const StudioCard = ({ studio, index }: { studio: typeof studios[number]; index: number }) => {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 260, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 260, damping: 22 });
  // ±12° rotation — clearly visible without being distracting
  const rotateY = useTransform(springX, [-0.5, 0.5], [-12, 12]);
  const rotateX = useTransform(springY, [-0.5, 0.5], [9, -9]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rawX.set((e.clientX - rect.left) / rect.width - 0.5);
    rawY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { rawX.set(0); rawY.set(0); };

  return (
    /* perspective wrapper — this is what makes rotateX/Y actually 3D */
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
          {/* Photo */}
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

            {/* Verified badge — top left */}
            <div
              className="absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{
                backgroundColor: "rgba(0,0,0,0.68)",
                color: "#FFFFFF",
                backdropFilter: "blur(6px)",
              }}
            >
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                <path d="M10 3L5 9L2 6" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Verified
            </div>

            {/* Price badge — bottom right */}
            <div
              className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: "rgba(0,0,0,0.72)",
                color: "#FFFFFF",
                backdropFilter: "blur(6px)",
              }}
            >
              {studio.price}
            </div>
          </div>

          {/* Info */}
          <div className="px-1">
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-tight" style={{ color: "#111111" }}>
                {studio.name}
              </h3>
              <p className="flex-shrink-0 text-xs" style={{ color: "rgba(17,17,17,0.45)" }}>
                {studio.area ? `${studio.area}, ` : ""}{studio.city}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {studio.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: "rgba(17,17,17,0.06)",
                    color: "#555555",
                    border: "1px solid rgba(17,17,17,0.07)",
                  }}
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

  /* Section-level scroll parallax */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  // Heading drifts up slower than scroll — depth cue
  const headingY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  // Decorative text drifts faster — feels closer
  const decoY    = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <section ref={sectionRef} id="features" className="relative overflow-hidden py-12 lg:py-16" style={{ backgroundColor: "#FFFFFF" }}>


      <motion.p
        aria-hidden="true"
        style={{ y: decoY }}
        className="pointer-events-none absolute right-[-2%] top-6 select-none font-black leading-none"
      >
        <span
          style={{
            fontSize: "clamp(80px, 14vw, 160px)",
            color: "transparent",
            WebkitTextStroke: "1px rgba(17,17,17,0.055)",
            letterSpacing: "-0.04em",
            fontFamily: "Georgia, serif",
            lineHeight: 1,
          }}
        >
          STUDIOS
        </span>
      </motion.p>

      <div className="mx-auto max-w-[1280px] px-4 md:px-10 xl:px-20">

        {/* Header — parallax: drifts up slower than scroll */}
        <motion.div
          style={{ y: headingY }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(17,17,17,0.45)" }}
            >
              Explore spaces
            </p>
            <h2
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(1.9rem, 3vw, 2.6rem)",
                fontWeight: 700,
                color: "#111111",
                lineHeight: 1.2,
              }}
            >
              Studios on ContCave
            </h2>
          </div>
          <Link
            href="/home"
            className="hidden items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70 md:flex"
            style={{ color: "#111111" }}
          >
            View all studios
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </Link>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio, i) => (
            <StudioCard key={studio.id} studio={studio} index={i} />
          ))}
        </div>

        {/* Mobile view-all */}
        <div className="mt-10 text-center md:hidden">
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: "#111111" }}
          >
            View all studios
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
            </svg>
          </Link>
        </div>

      </div>
    </section>
  );
};

export default StudioShowcase;
