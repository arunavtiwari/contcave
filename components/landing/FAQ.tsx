"use client";
import { motion } from "framer-motion";
import { useState } from "react";

import SectionHeader from "@/components/ui/SectionHeader";
import Container from "@/components/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";

import faqData from "./faqData";
import FAQItem from "./FAQItem";

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
      <script
        type="application/ld+json"
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
                badge="Common questions"
                title={
                  <>
                    Everything you{" "}
                    <span className="relative inline-block before:absolute before:bottom-2.5 before:left-0 before:-z-1 before:h-3 before:w-full before:bg-accent">
                      need to know.
                    </span>
                  </>
                }
                description="About booking a studio, listing your space, or how ContCave works."
                isLanding
                className="mt-10 mb-6"
                badgeClassName="text-foreground"
              />

              <Button
                label="Still have questions? Message us"
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
                target="_blank"
                variant="ghost"
                rounded
                fit
                classNames="mt-2"
                icon={(props) => (
                  <svg
                    {...props}
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10.4767 6.16701L6.00668 1.69701L7.18501 0.518677L13.6667 7.00034L7.18501 13.482L6.00668 12.3037L10.4767 7.83368H0.333344V6.16701H10.4767Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
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
