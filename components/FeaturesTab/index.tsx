"use client";
import { motion } from "framer-motion";
import { FiCheckCircle, FiEye, FiSearch } from "react-icons/fi";

/*
  HowItWorks — replaces the old tabbed FeaturesTab component.
  3-step horizontal flow (desktop) / vertical stack (mobile).
  No tabs, no illustrations, no animation delays on content.
*/

const STEPS = [
  {
    Icon: FiSearch,
    step: "01",
    title: "Search",
    body: "Filter by city and shoot type. Every listing has real photos, equipment details, and transparent pricing.",
  },
  {
    Icon: FiEye,
    step: "02",
    title: "Compare",
    body: "See studio layouts, gear lists, and availability. No surprises on shoot day.",
  },
  {
    Icon: FiCheckCircle,
    step: "03",
    title: "Book",
    body: "Confirm your slot instantly. Show up and shoot.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-12 lg:py-16" style={{ backgroundColor: "#FFFFFF" }}>
      <div className="mx-auto max-w-[1280px] px-4 md:px-10 xl:px-20">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p
            className="mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(17,17,17,0.45)" }}
          >
            Simple by design
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
            How ContCave works
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
          {STEPS.map(({ Icon, step, title, body }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className={`relative flex flex-col gap-4 px-5 py-8 md:px-10 ${
                i < STEPS.length - 1
                  ? "border-b border-black/[0.08] md:border-b-0 md:border-r md:border-black/[0.08]"
                  : ""
              }`}
            >
              {/* Step number — top right, muted */}
              <span
                className="absolute right-8 top-8 text-[11px] font-semibold tracking-[0.18em]"
                style={{ color: "rgba(17,17,17,0.2)" }}
              >
                {step}
              </span>

              {/* Icon — spring-bounce on viewport entry */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 14, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: "#111111" }}
              >
                <Icon size={18} color="#FFFFFF" />
              </motion.div>

              {/* Title */}
              <h3
                className="text-xl font-semibold"
                style={{ color: "#111111" }}
              >
                {title}
              </h3>

              {/* Body */}
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#666666" }}
              >
                {body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Divider line below steps — desktop only */}
        <div
          className="mt-0 hidden md:block"
          style={{ borderTop: "1px solid rgba(17,17,17,0.08)" }}
        />

      </div>
    </section>
  );
};

export default HowItWorks;
