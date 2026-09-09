"use client";
import { motion } from "framer-motion";
import { FiArrowRight, FiCheck, FiX } from "react-icons/fi";

import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";

const WITHOUT_CONTCAVE =
  "Find a photographer. Negotiate. Book HMU. Confirm equipment. Chase everyone on WhatsApp.";
const WITH_CONTCAVE = "Send one brief. Show up. Shoot.";

const INCLUDED = [
  "Dedicated production coordinator",
  "Photographer & vendor matching",
  "Equipment planning",
  "Scheduling & coordination",
  "WhatsApp support till wrap",
];

const WHATSAPP_MESSAGE =
  "Hi ContCave! I want Production Concierge for my shoot. Here's my brief:";

const ProductionConcierge = () => {
  const whatsappHref = `https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

  return (
    <section id="production-concierge" className="py-section bg-muted/30">
      <Container>
        <SectionHeader
          badge="Production Concierge"
          title="One coordinator. Your entire shoot, handled."
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          className="flex flex-col gap-10 rounded-3xl bg-foreground p-8 lg:flex-row lg:gap-16 lg:p-12"
        >
          <div className="flex flex-col gap-8 lg:w-3/5">
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <FiX size={16} className="mt-0.5 shrink-0 text-background/40" />
                <p className="text-sm text-background/50">
                  <span className="font-semibold text-background/70">Without ContCave — </span>
                  {WITHOUT_CONTCAVE}
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <FiCheck size={16} className="mt-0.5 shrink-0 text-success" />
                <p className="text-base text-background">
                  <span className="font-semibold">With ContCave — </span>
                  {WITH_CONTCAVE}
                </p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-background/50">
                Included
              </p>
              <ul className="flex flex-col gap-2.5">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-background/85">
                    <FiCheck size={15} className="shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col justify-center lg:w-2/5 lg:border-l lg:border-background/10 lg:pl-12">
            <p className="mb-2 text-lg font-bold text-background">
              From ₹1,999. <span className="font-medium text-background/60">Free above ₹50,000.</span>
            </p>
            <Button
              label="Plan my shoot"
              icon={FiArrowRight}
              href={whatsappHref}
              target="_blank"
              variant="outline"
              size="lg"
              rounded
              fit
            />
          </div>
        </motion.div>
      </Container>
    </section>
  );
};

export default ProductionConcierge;
