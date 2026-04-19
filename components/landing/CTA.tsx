"use client";

import { motion } from "framer-motion";

import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

const CTA = () => {
  return (
    <section className="py-section">
      <Container>
        <div className="relative rounded-3xl overflow-hidden bg-background border-l-8 border-l-primary shadow-sm">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute -inset-14 bg-[radial-gradient(circle,var(--color-foreground)_1.5px,transparent_1.5px)] opacity-[0.08] bg-size-[28px_28px]"
              animate={{ x: [0, 28, 0], y: [0, 28, 0] }}
              transition={{ duration: 20, ease: "linear", repeat: Infinity }}
            />
          </div>

          <div className="relative z-10 flex flex-col gap-10 px-6 py-12 md:px-10 lg:flex-row lg:items-center lg:gap-20 xl:px-20 xl:py-14 bg-background/40 backdrop-blur-[1px]">

            <motion.div
              variants={{ hidden: { opacity: 0, y: -20 }, visible: { opacity: 1, y: 0 } }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 0.8, delay: 0.1 }}
              viewport={{ once: true }}
              className="lg:w-1/2 flex flex-col gap-4"
            >
              <p className="text-xs font-semibold uppercase tracking-accent text-foreground rounded-full border border-foreground/10 px-4 py-2 w-fit">
                For studio owners
              </p>

              <Heading
                title="Your studio deserves serious creators."
                subtitle="Connect your space with active creators and brands. Get consistent, high-quality bookings without the back-and-forth."
                variant="h2"
              />

              <Button
                label="List your studio"
                href="/home"
                size="lg"
                rounded
                fit
              />

              <p className="mt-4 text-xs text-muted-foreground/60">
                No listing fee. Commission only on confirmed bookings.
              </p>
            </motion.div>

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
