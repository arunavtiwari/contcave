"use client";

import { motion } from "framer-motion";


function Loader() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-[calc(100vh-80px)] flex flex-col justify-center items-center overflow-hidden"
    >
      <div className="relative flex justify-center items-center">
        {/* Spinner Outer */}
        <div className="absolute w-24 h-24 border-8 border-r-transparent border-foreground rounded-full animate-spin-slow"></div>

        {/* Pulse Inner */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: [0.8, 1.2, 0.8] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="relative w-16 h-16 bg-foreground rounded-full"
        ></motion.div>

        {/* Core Dot */}
        <motion.div
          className="absolute w-6 h-6 bg-muted-foreground/30 rounded-full"
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
