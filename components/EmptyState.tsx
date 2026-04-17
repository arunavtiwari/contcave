"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import React from "react";
import { FiSearch } from "react-icons/fi";

import Heading from "./ui/Heading";

type Props = {
  title?: string;
  subtitle?: string;
  showReset?: boolean;
};

function EmptyState({
  title = "No exact matches",
  subtitle = "Try changing or removing some of your filters.",
  showReset,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-[60vh] flex flex-col items-center justify-center text-center px-6"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted border border-border">
        <FiSearch className="h-8 w-8 text-muted-foreground" />
      </div>

      <Heading
        center
        title={title}
        subtitle={subtitle}
        variant="h3"
      />

      {showReset && (
        <div className="mt-8">
          <Link
            href="/home"
            className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
          >
            Clear all filters
          </Link>
        </div>
      )}
    </motion.div>
  );
}

export default EmptyState;
