"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useMemo } from "react";
import { HiChevronDown } from "react-icons/hi";

type FaqData = {
  activeFaq: number;
  id: number;
  handleFaqToggle: (id: number) => void;
  quest: string;
  ans: string;
};

import Heading from "@/components/ui/Heading";

const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
      opacity: { duration: 0.2, ease: "easeOut" },
    },
  },
  expanded: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.4, ease: [0.32, 0.72, 0, 1] },
      opacity: { duration: 0.25, delay: 0.12, ease: "easeIn" },
    },
  },
} as const;

const chevronTransition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  mass: 0.8,
} as const;

const FAQItem = ({ faqData }: { faqData: FaqData }) => {
  const { activeFaq, id, handleFaqToggle, quest, ans } = faqData;
  const isOpen = activeFaq === id;

  const onToggle = useCallback(() => handleFaqToggle(id), [handleFaqToggle, id]);

  const chevronAnimate = useMemo(
    () => ({ rotate: isOpen ? 180 : 0 }),
    [isOpen],
  );

  return (
    <div className="flex flex-col border-b border-border last-of-type:border-none">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`flex cursor-pointer items-center justify-between px-6 py-5 text-base font-medium transition-colors duration-200 group w-full text-left ${isOpen
          ? "bg-muted/40 text-foreground"
          : "text-foreground/70 hover:text-foreground hover:bg-muted/20"
          }`}
      >
        <Heading
          title={quest}
          variant="h6"
          className="pr-4 text-base!"
        />

        <motion.div
          animate={chevronAnimate}
          transition={chevronTransition}
          className="shrink-0 will-change-transform"
        >
          <HiChevronDown size={20} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            variants={contentVariants}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            className="overflow-hidden will-change-[height,opacity]"
          >
            <div className="border-t border-border px-6 py-5 lg:px-9 lg:py-8 bg-muted/10">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {ans}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FAQItem;
