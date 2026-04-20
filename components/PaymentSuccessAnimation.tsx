"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";

type PaymentStatus = "success" | "error";

export default function PaymentAnimation({ status }: { status: PaymentStatus }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    // Keep flipping automatically every 3 seconds
    const timer = setInterval(() => setFlipped((prev) => !prev), 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-14 w-14">
      <motion.div
        className="relative h-full w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
      >

        {/* Front Face: Tick / Error */}
        <div
          className={`absolute inset-0 flex items-center justify-center rounded-full backface-hidden ${status === "success" ? "bg-success shadow-lg shadow-success/20" : "bg-warning shadow-lg shadow-warning/20"
            }`}
        >
          <Image
            src={
              status === "success"
                ? "/images/icons/tick.png"
                : "/images/icons/error.png"
            }
            alt={status === "success" ? "Booking Success" : "Booking Error"}
            width={56}
            height={56}
            priority
            className="object-cover"
          />
        </div>


        {/* Back Face: ContCave Logo (Shows when flipped) */}
        <div className="absolute inset-0 flex items-center justify-center rounded-full backface-hidden transform-[rotateY(180deg)]">
          <Image
            src="/images/logo/logo_small.png"
            alt="ContCave Icon Logo"
            width={56}
            height={56}
            priority
            className="object-cover rounded-full"
          />
        </div>

      </motion.div>
    </div>
  );
}

