"use client";

import { motion } from "framer-motion";
import React from "react";

type Props = {};

function Loader({ }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-80px)] flex flex-col justify-center items-center overflow-hidden"
    >
      {/* Custom Loader Animation */}
      <div className="relative flex justify-center items-center">

        <div className="absolute w-[100px] h-[100px] border-[8px] border-r-transparent border-black rounded-full animate-spin-slow"></div>

        {/* Middle Pulsating Circle */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-[60px] h-[60px] bg-black rounded-full"
        ></motion.div>

        {/* Inner Circle */}
        <motion.div
          className="absolute w-[25px] h-[25px] bg-gray-300 rounded-full"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        ></motion.div>
      </div>
    </motion.div>
  );
}

export default Loader;
