"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import { HiChevronDown } from "react-icons/hi";

import Heading from "@/components/ui/Heading";

type Props = {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
};

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

const FAQItem = ({ question, answer, isOpen, onToggle }: Props) => {
  const answerId = useId();

  return (
    <div className="flex flex-col border-b border-border last-of-type:border-none">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        className={`flex cursor-pointer items-center justify-between px-6 py-5 text-base font-medium transition-colors duration-200 group w-full text-left ${isOpen
          ? "bg-muted/40 text-foreground"
          : "text-foreground/70 hover:text-foreground hover:bg-muted/20"
          }`}
      >
        <Heading
          as="h3"
          title={question}
          variant="h6"
          className="pr-4 text-base!"
        />

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={chevronTransition}
          className="shrink-0 will-change-transform"
        >
          <HiChevronDown size={20} />
        </motion.div>
      </button>

      <motion.div
        id={answerId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        initial={false}
        animate={isOpen ? "expanded" : "collapsed"}
        variants={contentVariants}
        className="overflow-hidden will-change-[height,opacity]"
      >
        <div className="border-t border-border px-6 py-5 lg:px-9 lg:py-8 bg-muted/10">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {answer}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default FAQItem;
