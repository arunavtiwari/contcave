"use client";
import { motion } from "framer-motion";
import { FiBriefcase, FiZap } from "react-icons/fi";

const STUDIO_TYPES = [
  "Cyclorama walls",
  "Product photography",
  "Natural light",
  "Video production",
  "Podcast & interview",
  "Fashion & lifestyle",
  "Vintage & themed sets",
  "Event spaces",
];

const QUALITY_SIGNALS = [
  "Every studio personally verified",
  "Dedicated production support",
  "Response within 24 hours",
];

const ForBrands = () => {
  return (
    <section
      id="for-brands"
      className="py-12 lg:py-16"
      style={{ backgroundColor: "#FAFAFA" }}
    >
      <div className="mx-auto max-w-[1280px] px-4 md:px-10 xl:px-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(17,17,17,0.45)" }}
          >
            For brands &amp; agencies
          </p>
          <h2
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "clamp(1.9rem, 3.2vw, 2.8rem)",
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#111111",
            }}
          >
            Two ways to work with us.
          </h2>
        </motion.div>

        {/* Quality signals strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-8 flex flex-wrap gap-x-8 gap-y-3"
        >
          {QUALITY_SIGNALS.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="h-[3px] w-3 flex-shrink-0 rounded-full"
                style={{ backgroundColor: "#111111" }}
              />
              <span className="text-sm font-medium" style={{ color: "#333333" }}>
                {s}
              </span>
            </div>
          ))}
        </motion.div>

        {/* Two-path grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* Left — Send brief */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            viewport={{ once: true }}
            className="group/dark relative flex flex-col overflow-hidden rounded-2xl p-6 lg:p-10"
            style={{
              backgroundColor: "#111111",
              minHeight: "280px",
            }}
          >
            {/* Shimmer sweep — slides across on parent hover via CSS group */}
            <div
              className="pointer-events-none absolute inset-0 z-0 translate-x-[-100%] transition-transform duration-500 ease-in-out group-hover/dark:translate-x-[100%]"
              style={{
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)",
              }}
            />

            {/* Content above shimmer */}
            <div className="relative z-10 flex flex-1 flex-col">
              {/* Icon */}
              <div
                className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <FiBriefcase size={18} color="#FFFFFF" />
              </div>
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Concierge service
              </p>
              <h3
                className="mb-4 flex-1"
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)",
                  fontWeight: 700,
                  color: "#FAF7F2",
                  lineHeight: 1.25,
                }}
              >
                Send us your brief
              </h3>
              <p
                className="mb-8 text-sm leading-relaxed"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Running a campaign? Share your brief — shoot type, dates, crew size, budget. We&apos;ll match you with the right studio and handle the coordination.
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                <a
                  href="mailto:info@contcave.com"
                  className="inline-block rounded-full px-6 py-2.5 text-sm font-semibold transition-transform duration-300 hover:scale-105"
                  style={{ backgroundColor: "#FFFFFF", color: "#111111" }}
                >
                  Share your brief
                </a>
                <a
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full px-6 py-2.5 text-sm font-medium transition-transform duration-300 hover:scale-105"
                  style={{
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  WhatsApp us
                </a>
              </div>
            </div>
          </motion.div>

          {/* Right — Book directly */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col rounded-2xl p-6 lg:p-10"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid rgba(17,17,17,0.09)",
              minHeight: "280px",
            }}
          >
            {/* Icon */}
            <div
              className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(17,17,17,0.06)", border: "1px solid rgba(17,17,17,0.08)" }}
            >
              <FiZap size={18} color="#111111" />
            </div>
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: "rgba(17,17,17,0.4)" }}
            >
              Instant book
            </p>
            <h3
              className="mb-4 flex-1"
              style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: "clamp(1.4rem, 2.2vw, 1.9rem)",
                fontWeight: 700,
                color: "#111111",
                lineHeight: 1.25,
              }}
            >
              Book directly
            </h3>
            <p
              className="mb-8 text-sm leading-relaxed"
              style={{ color: "#555555" }}
            >
              Know what you&apos;re looking for? Browse verified studios, check real-time availability, and book instantly. Your crew, your gear — our space.
            </p>

            {/* Studio type tags */}
            <div className="mb-8 flex flex-wrap gap-2">
              {STUDIO_TYPES.map((t) => (
                <span
                  key={t}
                  className="rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    backgroundColor: "rgba(17,17,17,0.05)",
                    color: "#444444",
                    border: "1px solid rgba(17,17,17,0.08)",
                  }}
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-auto">
              <a
                href="/home"
                className="inline-block rounded-full px-6 py-2.5 text-sm font-semibold transition-transform duration-300 hover:scale-105"
                style={{ backgroundColor: "#111111", color: "#FFFFFF" }}
              >
                Browse studios
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

export default ForBrands;
