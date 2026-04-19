"use client";
import { motion } from "framer-motion";
import { FiBriefcase, FiZap } from "react-icons/fi";

import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import SectionHeader from "@/components/ui/SectionHeader";

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
      className="py-section bg-muted/30"
    >
      <Container>

        <SectionHeader
          badge="For Business"
          title="Book spaces that convert."
        />

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mb-8 flex flex-wrap gap-x-8 gap-y-3"
        >
          {QUALITY_SIGNALS.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className="h-0.75 w-3 shrink-0 rounded-full bg-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {s}
              </span>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            viewport={{ once: true }}
            className="group/dark relative flex min-h-70 flex-col overflow-hidden rounded-2xl bg-primary p-6 lg:p-10"
          >
            <div className="pointer-events-none absolute inset-0 z-0 -translate-x-full bg-linear-to-r from-transparent via-background/5 to-transparent transition-transform duration-500 ease-in-out group-hover/dark:translate-x-full" />

            <div className="relative z-10 flex flex-1 flex-col">
              <div className="flex-1">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-background/10">
                  <FiBriefcase size={18} className="text-background" />
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-accent text-background/50">
                  Concierge service
                </p>
                <Heading
                  title="Built for Speed"
                  variant="h3"
                  className="mb-3 text-background!"
                  subtitle="Find, book, and confirm in flat 2 minutes. No more back-and-forth on WhatsApp."
                  subtitleClassName="text-background/70!"
                />
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  label="Share your brief"
                  href="mailto:info@contcave.com"
                  variant="outline"
                  rounded
                  fit
                />
                <Button
                  label="WhatsApp us"
                  href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP}`}
                  target="_blank"
                  variant="secondary"
                  rounded
                  fit
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex min-h-70 flex-col rounded-2xl border border-border bg-background p-6 lg:p-10"
          >
            <div className="flex flex-col flex-1">
              <div className="flex-1">
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 border border-foreground/5">
                  <FiZap size={18} className="text-foreground" />
                </div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-accent text-muted-foreground">
                  Instant book
                </p>
                <Heading
                  title="Verified Listings"
                  variant="h3"
                  subtitle="Every space is vetted by our team. What you see is exactly what you get."
                  className="text-foreground!"
                />

                {/* Studio type tags */}
                <div className="mt-8 flex flex-wrap gap-2">
                  {STUDIO_TYPES.map((t) => (
                    <span
                      key={t}
                      className="rounded-full border-2 border-border px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <Button
                  label="Browse studios"
                  href="/home"
                  variant="outline"
                  rounded
                  fit
                />
              </div>
            </div>
          </motion.div>

        </div>
      </Container>
    </section>
  );
};

export default ForBrands;
