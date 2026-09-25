"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { HiArrowRight } from "react-icons/hi";

import faqData from "@/components/landing/faqData";
import FAQItem from "@/components/landing/FAQItem";
import Container from "@/components/layout/Container";
import JsonLd from "@/components/seo/JsonLd";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import { buildWhatsAppUrl } from "@/lib/whatsapp/urls";

const FAQ = () => {
  const [activeFaq, setActiveFaq] = useState(1);

  const handleFaqToggle = (id: number) => {
    activeFaq === id ? setActiveFaq(0) : setActiveFaq(id);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqData.map((faq) => ({
      "@type": "Question",
      name: faq.quest,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.ans,
      },
    })),
  };

  return (
    <>
      <JsonLd id="faq-jsonld" data={faqSchema} />

      <section className="overflow-hidden py-section">

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
                title={<>Questions? We have <span className="text-muted-foreground italic">Answers</span></>}
                description="Everything you need to know about booking, payments, and studio protocols."
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
                {faqData.map((faq, key) => (
                  <FAQItem
                    key={key}
                    faqData={{ ...faq, activeFaq, handleFaqToggle }}
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
