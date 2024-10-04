"use client";
import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import Link from "next/link";

const CTA = () => {
  return (
    <>
      {/* CTA Section */}
      <section className="px-4 py-20 md:px-8 lg:py-22.5 2xl:px-0">
        <div className="relative z-1 mx-auto max-w-c-1390 rounded-lg bg-gradient-to-t from-[#F8F9FF] to-[#DEE7FF] py-12.5 xl:py-17.5">
          {/* Decorative Images */}
          <Image
            width={310}
            height={299}
            src="/images/shape/open_banner.png"
            alt="Listing"
            className="absolute -right-15 -top-25 -z-1 lg:right-0"
          />

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
              List Your Space with Us & Boost Your Visibility
            </h2>
            <p className="mx-auto lg:w-11/12">
              Are you a property owner with a space to rent hourly? Join our platform to showcase your property and connect with potential clients. Increase your visibility and attract more bookings effortlessly.
            </p>
          </motion.div>

          {/* Button Section */}
          <div className="flex justify-center">
            <Link href="/home" className="flex rounded-full bg-black px-7.5 py-2.5 text-white duration-300 ease-in-out hover:bg-blackho">
              <button aria-label="list your space button">List Your Space</button>
            </Link>
          </div>
        </div>
      </section>
      {/* CTA End */}
    </>
  );
};

export default CTA;
