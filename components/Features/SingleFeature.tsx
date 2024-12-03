import React from "react";
import { Feature } from "@/types/feature";
import { motion } from "framer-motion";
import Link from "next/link";

const SingleFeature = ({ feature }: { feature: Feature }) => {
  const { icon, title, description, button_text } = feature;

  return (
    <>
      <motion.div
        className="group relative overflow-hidden rounded-2xl border border-white bg-cover bg-center bg-no-repeat shadow-solid-3 transition-all hover:shadow-solid-4"
        style={{
          backgroundImage: `url(${icon})`,
          height: "350px",
        }}
        variants={{
          hidden: {
            opacity: 0,
            y: -10,
          },
          visible: {
            opacity: 1,
            y: 0,
          },
        }}
        initial="hidden"
        whileInView="visible"
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
      >
        {/* Overlay for Hover Effect */}
        <div className="absolute inset-0 bg-black/50 transition-all duration-1000 group-hover:backdrop-blur-sm"></div>

        {/* Title & Static Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-8 transition-transform duration-1000 transform group-hover:-translate-y-full">
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>

        {/* Hover Content (Description and Button) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-8 transition-transform duration-1000 transform translate-y-full group-hover:translate-y-0">
          <p className="mb-6">{description}</p>
          <Link href="/home" passHref>
            <button className="px-4 py-2 bg-white/20 rounded-full hover:opacity-85 backdrop-blur-sm">
              {button_text}
            </button></Link>
        </div>
      </motion.div>
    </>
  );
};

export default SingleFeature;
