"use client";

import { motion } from "framer-motion";
import React from "react";
import { FiSearch } from "react-icons/fi";

import Button from "./ui/Button";
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
          <Button
            label="Clear all filters"
            onClick={() => window.location.href = '/home'}
            classNames="px-8"
            rounded
          />
        </div>
      )}
    </motion.div>
  );
}

export default EmptyState;

