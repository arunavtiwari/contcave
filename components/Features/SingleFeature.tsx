import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { Feature } from "@/types/feature";

const SingleFeature = ({ feature }: { feature: Feature }) => {
  const { icon, title, description, button_text } = feature;

  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl shadow-solid-3 hover:shadow-solid-4 transition-shadow"
      style={{ height: "350px" }}
      variants={{
        hidden: { opacity: 0, y: -10 },
        visible: { opacity: 1, y: 0 },
      }}
      initial="hidden"
      whileInView="visible"
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <Image
        src={icon}
        alt={title}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      />

      {/* Base overlay + hover blur */}
      <div className="absolute inset-0 bg-black/50 transition-all duration-700 group-hover:backdrop-blur-sm" />

      {/* ── DESKTOP: title centered, slides up on hover ── */}
      <div className="absolute inset-0 hidden flex-col items-center justify-center p-8 text-center text-white transition-transform duration-700 group-hover:-translate-y-full md:flex">
        <h3 className="text-xl font-semibold">{title}</h3>
      </div>

      {/* ── DESKTOP: description slides up from below on hover ── */}
      <div className="absolute inset-0 hidden translate-y-full flex-col items-center justify-center p-8 text-center text-white transition-transform duration-700 group-hover:translate-y-0 md:flex">
        <p className="mb-5 text-sm leading-relaxed text-white/90">{description}</p>
        <Link
          href="/home"
          className="rounded-full px-5 py-2 text-sm font-medium backdrop-blur-sm transition-colors"
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
          }}
        >
          {button_text}
        </Link>
      </div>

      {/* ── MOBILE: title + description always visible at bottom ── */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 text-white md:hidden">
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-white/80">{description}</p>
      </div>
    </motion.div>
  );
};

export default SingleFeature;
