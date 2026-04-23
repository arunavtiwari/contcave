"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { HiArrowRight } from "react-icons/hi";

import Container from "@/components/Container";
import faqData from "@/components/landing/faqData";
import FAQItem from "@/components/landing/FAQItem";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";

const FAQ = ({ nonce }: { nonce?: string }) => {
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
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
        }}
      />

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
                title={<>Questions? We have <span className="text-secondary italic">Answers</span></>}
                description="Everything you need to know about booking, payments, and studio protocols."
                className="mb-12"
                badgeClassName="md:mx-0"
              />

              <Button
                label="Still have questions? Message us"
                href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP}`}
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
