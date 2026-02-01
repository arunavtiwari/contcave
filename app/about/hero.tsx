"use client";
import { motion } from "framer-motion";
import Image from "next/image";

const Hero = () => {
  return (
    <div className="relative h-[80vh] w-full overflow-hidden">
      
      <motion.div
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 20, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/images/hero/hero-creator.png" 
          alt="Creator at Work"
          fill
          className="object-cover"
          priority
        />
      </motion.div>

      
      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center px-6">
        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-5xl md:text-6xl font-extrabold text-white leading-tight"
        >
          Where Creators Bring Spaces to Life
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="text-gray-200 text-lg mt-6 max-w-2xl"
        >
          From cafés to studios — we help creators find and transform spaces
          into canvases for human creation.
        </motion.p>

        <motion.a
          href="/home"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-8 inline-block bg-white text-black px-8 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
        >
          Get Started
        </motion.a>
      </div>
    </div>
  );
};

export default Hero;
