"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const Cover = () => {
  return (
    <>
      <section className="px-4 py-20 md:px-8 lg:py-22.5 2xl:px-0 bg-black">
        <div className="relative z-1 mx-auto max-w-c-1390 ">
          <motion.div
            variants={{
              hidden: {
                opacity: 0,
                y: -20,
              },
              visible: {
                opacity: 1,
                y: 0,
              },
            }}
            initial="hidden"
            whileInView="visible"
            transition={{ duration: 1, delay: 0.1 }}
            viewport={{ once: true }}
            className="mx-auto"
          >
            <Image
              width={0}
              height={0}
              src="/images/cover.svg"
              alt="Cover"
              className="w-full h-full object-cover"
            />
          </motion.div>
        </div>
      </section>

    </>
  );
};

export default Cover;
