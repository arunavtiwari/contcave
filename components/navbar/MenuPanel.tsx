"use client";

import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

const HIDDEN = { opacity: 0, scale: 0.95, y: -8 };

export default function MenuPanel({ open, className, children }: { open: boolean; className?: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={HIDDEN}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={HIDDEN}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "absolute right-0 top-full mt-2.5 rounded-2xl bg-background/95 backdrop-blur-xl overflow-hidden text-sm border border-border z-50 will-change-transform",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
