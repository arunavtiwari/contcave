"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";


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

const StudioCard = ({ studio, index }: { studio: typeof studios[number]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay: index * 0.07 }}
    viewport={{ once: true }}
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
          <h3
            className="text-sm font-semibold leading-tight"
            style={{ color: "#111111" }}
          >
            {studio.name}
          </h3>
          <p
            className="flex-shrink-0 text-xs"
            style={{ color: "rgba(17,17,17,0.45)" }}
          >
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
);

const StudioShowcase = () => {
  return (
    <section id="features" className="py-12 lg:py-16" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-10 xl:px-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
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

        {/* Grid */}
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {studios.map((studio, i) => (
            <StudioCard key={studio.id} studio={studio} index={i} />
          ))}
        </div>

        {/* Mobile view-all link */}
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
