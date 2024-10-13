"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";

const FunFact = () => {
  return (
    <>
      <section className="px-4 py-20 md:px-8 lg:py-22.5 2xl:px-0">
        <div className="relative z-1 mx-auto max-w-c-1390 rounded-lg bg-gradient-to-t from-[#F8F9FF] to-[#DEE7FF] py-22.5 xl:py-27.5">
          <Image
            width={235}
            height={284}
            src="/images/shape/camera.png"
            alt="Camera"
            className="absolute bottom-0 left-0 transform translate-y-0 lg:left-0 lg:top-0 lg:translate-y-0 w-[150px] md:w-[200px] lg:w-[300px]" // Positioned at bottom left on mobile
          />

          <Image
            width={132}
            height={132}
            src="/images/shape/shape-05.png"
            alt="Doodle"
            className="absolute bottom-0 right-0 -z-1"
          />

          {/* Dotted Images */}
          <Image
            fill
            src="/images/shape/shape-dotted-light-02.svg"
            alt="Dotted"
            className="absolute left-0 top-0 -z-1"
          />
          <Image
            fill
            src="/images/shape/shape-dotted-dark-02.svg"
            alt="Dotted"
            className="absolute left-0 top-0 -z-1 hidden"
          />

          {/* Motion Text */}
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
            className="animate_top mx-auto mb-12.5 px-4 text-center md:w-4/5 md:px-0 lg:mb-17.5 lg:w-2/3 xl:w-1/2"
          >
            <h2 className="mb-4 text-3xl font-bold text-black xl:text-sectiontitle3">
              The Next Big Project Awaits. Start Here
            </h2>
            <p className="mx-auto lg:w-11/12">
              You've taken the first step toward realizing your creative dreams. Now, let ContCave guide you to the perfect studio, equipment, and talent to bring your vision to life.
            </p>
          </motion.div>

          <div className="flex justify-center">
            <Link
              href="/home"
              className="flex rounded-full bg-black px-7.5 py-2.5 text-white duration-300 ease-in-out hover:bg-blackho"
            >
              <button aria-label="get started button">Get Started</button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default FunFact;
