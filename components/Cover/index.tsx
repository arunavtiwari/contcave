"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const Cover = () => {
  return (
    <>
      <section className="px-4 py-20 md:px-8 lg:py-22.5 2xl:px-0 bg-black">
        <div className="relative z-1 mx-auto max-w-c-1390 ">
            <Image
              width={0}
              height={0}
              src="/images/cover.svg"
              alt="Cover"
              className="w-full h-full object-cover"
            />
        </div>
      </section>

    </>
  );
};

export default Cover;
