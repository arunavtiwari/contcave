"use client";
import { motion } from "framer-motion";
import { FiCheckCircle, FiEye, FiSearch } from "react-icons/fi";

import Container from "@/components/Container";

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
    <section className="py-section bg-background">
      <Container>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-10"
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-accent text-muted-foreground/60">
            Simple by design
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
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
              className={`relative flex flex-col gap-4 px-5 py-8 md:px-10 ${i < STEPS.length - 1
                ? "border-b border-border/40 md:border-b-0 md:border-r md:border-border/40"
                : ""
                }`}
            >
              {/* Step number — top right, muted */}
              <span className="absolute right-8 top-8 text-[11px] font-semibold tracking-accent text-muted-foreground/30">
                {step}
              </span>

              {/* Icon — spring-bounce on viewport entry */}
              <motion.div
                initial={{ scale: 0.4, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 320,
                  damping: 14,
                  delay: i * 0.1,
                }}
                viewport={{ once: true }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground"
              >
                <Icon size={18} />
              </motion.div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-foreground">{title}</h3>

              {/* Body */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Divider line below steps — desktop only */}
        <div className="mt-0 hidden md:block border-t border-border/40" />
      </Container>
    </section>
  );
};

export default HowItWorks;
