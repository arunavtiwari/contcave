"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import React from "react";

import Container from "@/components/Container";

const CTA = () => {
  return (
    <section className="py-section">
      <Container>
        <div
          className="relative overflow-hidden rounded-lg bg-background border border-border"
        >
          {/* Black accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />

          {/* Dot grid texture — slowly drifts for a living feel */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute"
              style={{
                inset: "-56px",
                backgroundImage: "radial-gradient(rgba(17,17,17,0.05) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
              animate={{ x: [0, 28, 0], y: [0, 28, 0] }}
              transition={{ duration: 10, ease: "linear", repeat: Infinity }}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-10 px-6 py-12 md:px-10 lg:flex-row lg:items-center lg:gap-20 xl:px-20 xl:py-20">

            {/* Left — headline + CTA */}
            <motion.div
              variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              <p className="mb-4 text-xs font-semibold uppercase tracking-accent text-foreground">
                For studio owners
              </p>

              <h2
                className="mb-6 font-serif text-foreground leading-[1.15]"
                style={{
                  fontSize: "clamp(2rem, 3.2vw, 2.8rem)",
                  fontWeight: 700,
                }}
              >
                Your studio deserves{" "}
                <em className="text-foreground not-italic">serious creators.</em>
              </h2>

              <p className="mb-8 text-base leading-relaxed text-muted-foreground">
                Connect your space with active creators and brands. Get consistent, high-quality bookings without the back-and-forth.
              </p>

              <Link
                href="/home"
                aria-label="List your studio on ContCave"
                className="inline-block rounded-full bg-primary text-primary-foreground px-7 py-3 text-base font-semibold transition-transform duration-300 hover:scale-105"
              >
                List your studio
              </Link>

              <p className="mt-4 text-xs text-muted-foreground/60">
                No listing fee. Commission only on confirmed bookings.
              </p>
            </motion.div>

            {/* Right — benefit list */}
            <motion.div
              variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.8, delay: 0.25 }}
              viewport={{ once: true }}
              className="lg:w-1/2"
            >
              {[
                {
                  num: "01",
                  title: "Verified clients",
                  body: "No wasted enquiries, just verified creators.",
                },
                {
                  num: "02",
                  title: "Properly found",
                  body: "Ranked by shoot type, equipment, and capacity.",
                },
                {
                  num: "03",
                  title: "Consistent demand",
                  body: "Stop relying exclusively on referrals.",
                },
                {
                  num: "04",
                  title: "Free to list",
                  body: "Commission on confirmed bookings only.",
                },
              ].map((item, i) => (
                <div
                  key={item.num}
                  className={`flex gap-5 py-5 border-border ${i === 0 ? "border-t" : ""} border-b`}
                >
                  <span className="w-6 shrink-0 text-sm font-bold text-foreground mt-0.5">
                    {item.num}
                  </span>
                  <div>
                    <p className="mb-1 text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default CTA;
