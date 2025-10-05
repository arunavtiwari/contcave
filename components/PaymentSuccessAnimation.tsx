"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

type PaymentStatus = "success" | "error";

export default function PaymentAnimation({ status }: { status: PaymentStatus }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFlipped(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100">
      <div
        className="relative h-32 w-32 cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <motion.div
          className="relative h-full w-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front face logo */}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black border shadow-lg backface-hidden overflow-hidden">
            <Image
              src="/images/logo/logo_small.png"
              alt="ContCave Icon Logo"
              width={128}
              height={128}
              className="object-cover"
            />
          </div>

          {/* Back face: tick or error cross depending on status */}
          <div
            className={`absolute flex h-full w-full items-center justify-center rounded-full text-5xl text-white [backface-visibility:hidden] [transform:rotateY(180deg)] ${status === "success" ? "bg-green-500" : "bg-yellow-500"
              }`}
          >
            <Image
              src={
                status === "success"
                  ? "/images/icon/tick.png"
                  : "/images/icon/error.png"
              }
              alt={status === "success" ? "Booking Success" : "Booking Error"}
              width={128}
              height={128}
              className="object-cover"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
