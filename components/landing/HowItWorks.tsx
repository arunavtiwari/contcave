"use client";
import { motion } from "framer-motion";
import { STEPS } from "@/constants/how-it-works";
import Container from "@/components/Container";
import Heading from "@/components/ui/Heading";
import SectionHeader from "@/components/ui/SectionHeader";

const HowItWorks = () => {
  return (
    <section className="py-section bg-background">
      <Container>
        <SectionHeader
          badge="Simple by design"
          title="How ContCave Works"
          isLanding
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map(({ Icon, step, title, body }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="relative flex flex-col gap-6 rounded-3xl border border-border bg-background p-8 shadow-sm transition-all duration-300 hover:shadow-md hover:border-foreground/10"
            >
              <span className="absolute right-6 top-6 text-2xl font-bold tracking-accent text-muted-foreground/10">
                {step}
              </span>

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
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background"
              >
                <Icon size={20} />
              </motion.div>

              <div className="flex flex-col gap-2">
                <Heading
                  title={title}
                  variant="h4"
                />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default HowItWorks;
