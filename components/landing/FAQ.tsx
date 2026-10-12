"use client";
import { motion } from "framer-motion";
import { type ReactNode, useState } from "react";
import { HiArrowRight } from "react-icons/hi";

import FAQItem from "@/components/landing/FAQItem";
import Container from "@/components/layout/Container";
import JsonLd from "@/components/seo/JsonLd";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { FAQ_ANCHOR, faqJsonLd } from "@/lib/seo";
import { buildWhatsAppUrl } from "@/lib/whatsapp/urls";
import type { Faq } from "@/types/faq";

type Props = {
  items: Faq[];
  title: ReactNode;
  description: string;
};

const FAQ = ({ items, title, description }: Props) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <>
      <JsonLd id="faq-jsonld" data={faqJsonLd(items)} />

      <section id={FAQ_ANCHOR} className="scroll-mt-24 overflow-hidden py-section">

        <Container>
          <div className="flex flex-wrap gap-8 md:flex-nowrap xl:gap-32">

            <motion.div
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_left md:w-2/5 lg:w-1/2"
            >
              <SectionHeader
                badge="FAQ"
                title={title}
                description={description}
                className="mb-12"
                badgeClassName="md:mx-0"
              />

              <Button
                label="Still have questions? Message us"
                href={buildWhatsAppUrl()}
                target="_blank"
                variant="ghost"
                rounded
                fit
                className="mt-2"
                icon={HiArrowRight}

              />
            </motion.div>

            <motion.div
              variants={{
                hidden: { opacity: 0, x: 20 },
                visible: { opacity: 1, x: 0 },
              }}
              initial="hidden"
              whileInView="visible"
              transition={{ duration: 1, delay: 0.1 }}
              viewport={{ once: true }}
              className="animate_right md:w-3/5 lg:w-1/2"
            >
              <div className="rounded-xl bg-background border border-border mt-10 overflow-hidden">
                {items.map((faq, index) => (
                  <FAQItem
                    key={faq.question}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={openIndex === index}
                    onToggle={() => setOpenIndex(openIndex === index ? null : index)}
                  />
                ))}
              </div>
            </motion.div>

          </div>
        </Container>
      </section>
    </>
  );
};

export default FAQ;
