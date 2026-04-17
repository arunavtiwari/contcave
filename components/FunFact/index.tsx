"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import Container from "@/components/Container";

const FunFact = () => {
  return (
    <>
      <section className="py-20 lg:py-24">
        <Container>
          <div className="relative z-1 rounded-lg bg-linear-to-t from-muted/50 to-accent/20 py-20 xl:py-24">

            <Image
              width={235}
              height={284}
              src="/images/shape/camera.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 left-0 transform translate-y-0 lg:left-0 lg:top-0 lg:translate-y-0 w-37.5 md:w-50 lg:w-75 hidden xl:block"

              sizes="(max-width: 768px) 150px, (max-width: 1024px) 200px, 300px"

            />

            <Image
              width={132}
              height={132}
              src="/images/shape/shape-05.png"
              alt=""
              aria-hidden="true"
              className="absolute bottom-0 right-0 -z-1"
              sizes="132px"

            />


            <Image
              fill
              src="/images/shape/shape-dotted-light-02.svg"
              alt=""
              aria-hidden="true"
              className="absolute left-0 top-0 -z-1"
              sizes="100vw"
            />
            <Image
              fill
              src="/images/shape/shape-dotted-dark-02.svg"
              alt=""
              aria-hidden="true"
              className="absolute left-0 top-0 -z-1 hidden"
              sizes="100vw"
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
              <h2 className="mb-4 text-3xl font-bold text-foreground xl:text-5xl">
                The Next Big Project Awaits. Start Here
              </h2>
              <p className="mx-auto lg:w-11/12">
                You've taken the first step toward realizing your creative dreams. Now, let ContCave guide you to the perfect studio, equipment, and talent to bring your vision to life.
              </p>
            </motion.div>

            <div className="flex justify-center">
              <Link
                href="/home"
                className="flex rounded-full bg-black px-6 py-2.5 text-white hover:scale-105 duration-300"
              >
                <button aria-label="get started button">Get Started</button>
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default FunFact;
