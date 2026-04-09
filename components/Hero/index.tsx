"use client";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: "50% 50%",
            end: "+=200px",
            scrub: 1,
          },
        })
        .to(containerRef.current, {
          scale: 0.9,
          borderRadius: "2em",
          duration: 1.5,
        });

      gsap
        .timeline({ repeat: -1, repeatDelay: 1 })
        .to("#changing-text", { opacity: 0, duration: 0.5 })
        .set("#changing-text", { textContent: "Studio" })
        .to("#changing-text", { opacity: 1, duration: 0.5 })
        .to("#changing-text", { opacity: 0, duration: 0.5, delay: 1 })
        .set("#changing-text", { textContent: "Shooting Space" })
        .to("#changing-text", { opacity: 1, duration: 0.5 })
        .to("#changing-text", { opacity: 0, duration: 0.5, delay: 1 })
        .set("#changing-text", { textContent: "Location" })
        .to("#changing-text", { opacity: 1, duration: 0.5 });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} id="hero-anim-track" className="overflow-hidden">
      <div className="flex items-center text-white relative h-[calc(100vh-80px)]">
        <div className="absolute inset-0 bg-black opacity-65 z-10" />

        <div className="container flex z-20 px-4 sm:px-8 lg:px-16">
          <div className="w-full sm:w-2/3 text-center sm:text-start">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
              Discover the perfect{" "}
              <span id="changing-text">Studio</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl opacity-70 mt-4">
              Whether you&apos;re telling a story or capturing a moment, find the
              space that elevates your vision.
            </p>
            <Link
              href="/home"
              className="bg-white mt-10 w-fit text-black px-6 py-2.5 rounded-full font-semibold text-lg shadow-sm hover:scale-105 duration-300 relative z-20 cursor-pointer inline-block"
            >
              Book Now
            </Link>
          </div>
        </div>

        <Image
          src="/images/hero/bg-hero.jpg"
          alt=""
          aria-hidden="true"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />

      </div>
    </div>
  );
};

export default Hero;
