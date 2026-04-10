"use client";
import { motion } from "framer-motion";
import { useState } from "react";

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

      <section className="overflow-hidden pb-12 lg:pb-16">

        <div className="relative mx-auto max-w-c-1235 px-4 md:px-8 xl:px-0">
          <div className="flex flex-wrap gap-8 md:flex-nowrap xl:gap-32.5">

            {/* Left column */}
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
              

              <p
                className="text-xs font-semibold tracking-[0.2em] uppercase mb-3 mt-10"
                style={{ color: "#111111" }}
              >
                Common questions
              </p>

              <h2 className="relative mb-4 text-3xl font-bold text-black xl:text-hero">
                Everything you{" "}
                <span className="relative inline-block before:absolute before:bottom-2.5 before:left-0 before:-z-1 before:h-3 before:w-full before:bg-slate-200">
                  need to know.
                </span>
              </h2>

              <p className="text-base text-gray-500 leading-relaxed mb-6">
                About booking a studio, listing your space, or how ContCave works.
              </p>


              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`}
                className="group mt-1 inline-flex items-center gap-1.5 text-black hover:font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="duration-300 group-hover:pr-2">
                  Still have questions? Message us
                </span>
                <svg
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
              </a>
            </motion.div>

            {/* Right column — FAQ accordion */}
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
              <div className="rounded-xl bg-white shadow-solid-8 border mt-10">
                {faqData.map((faq, key) => (
                  <FAQItem
                    key={key}
                    faqData={{ ...faq, activeFaq, handleFaqToggle }}
                  />
                ))}
              </div>
            </motion.div>

          </div>
        </div>
      </section>
    </>
  );
};

export default FAQ;