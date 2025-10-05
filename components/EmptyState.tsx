"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import React from "react";
import Heading from "./Heading";

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
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="h-[60vh] flex flex-col gap-2 justify-center items-center"
    >
      <Heading center title={title} subtitle={subtitle} />
      <div className="mt-3">
        {showReset && (
          <button
            onClick={() => router.push("/home")}
            className="hover:bg-black hover:text-white py-1.5 px-4 rounded-full bg-white text-black border border-black transition-colors duration-300"
          >
            Clear Filters
          </button>
        )}
      </div>
    </motion.div >
  );
}

export default EmptyState;
