"use client";

import { AnimatePresence, motion } from "framer-motion";

type FaqData = {
  activeFaq: number;
  id: number;
  handleFaqToggle: (id: number) => void;
  quest: string;
  ans: string;
};

const FAQItem = ({ faqData }: { faqData: FaqData }) => {
  const { activeFaq, id, handleFaqToggle, quest, ans } = faqData;
  const isOpen = activeFaq === id;

  return (
    <div className="flex flex-col border-b border-border last-of-type:border-none">
      <button
        onClick={() => {
          handleFaqToggle(id);
        }}
        className={`flex cursor-pointer items-center justify-between px-6 py-5 text-base font-medium transition-colors duration-200 group w-full text-left ${isOpen
          ? "bg-muted/40 text-foreground"
          : "text-foreground/70 hover:text-foreground hover:bg-muted/20"
          }`}
      >
        <span className="pr-4">
          {quest}
        </span>

        <motion.div
          animate={{
            rotate: isOpen ? 45 : 0,
            scale: isOpen ? 1.1 : 1,
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="shrink-0"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M7.83331 7.83337V0.833374H10.1666V7.83337H17.1666V10.1667H10.1666V17.1667H7.83331V10.1667H0.833313V7.83337H7.83331Z"
              fill="currentColor"
            />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
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

