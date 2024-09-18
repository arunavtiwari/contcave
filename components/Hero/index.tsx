"use client";
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  useEffect(() => {
    // GSAP ScrollTrigger effect for pinning and scaling
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero-anim-track',
        pin: true,
        start: '50% 50%',
        end: '+=200px',
        scrub: 1,
        snap: {
          snapTo: 'labels',
          duration: { min: 0.1, max: 0.5 },
          delay: 0,
          ease: 'linear',
        },
      },
    });

    tl.to('#hero-anim-track', {
      scale: 0.9,
      borderRadius: "2em",
      duration: 1.5,
    })
      .to('#hero-anim-track svg', {
        rotate: 180,
        duration: 0.2,
      })
      .to('#hero-anim-track', {
        boxShadow: '0 0px 0px rgba(0,0,0,0.30), 0 0px 0px rgba(0,0,0,0.22)',
        duration: 2,
        ease: 'linear',
      });

    // Text changing animation
    let textTl = gsap.timeline({ repeat: -1, repeatDelay: 1 });
    textTl.to('#changing-text', { opacity: 0, duration: 0.5 })
      .set('#changing-text', { textContent: 'Studio' })
      .to('#changing-text', { opacity: 1, duration: 0.5 })
      .to('#changing-text', { opacity: 0, duration: 0.5, delay: 1 })
      .set('#changing-text', { textContent: 'Shooting Space' })
      .to('#changing-text', { opacity: 1, duration: 0.5 })
      .to('#changing-text', { opacity: 0, duration: 0.5, delay: 1 })
      .set('#changing-text', { textContent: 'Location' })
      .to('#changing-text', { opacity: 1, duration: 0.5 });

  }, []);

  return (
    <div id="hero-anim-track" className="overflow-hidden shadow-lg">
      <div className="hero flex items-end min-h-screen bg-gradient-to-r from-purple-600 to-blue-500 text-white relative">
        <div className="txt w-full px-4 py-8 m-10 flex flex-col">
          <h1 className="text-4xl font-bold">
            Discover the perfect <span id="changing-text">Studio</span>
          </h1>
          <p className="text-lg opacity-70 mt-4">
            Whether you’re telling a story or capturing a moment, find the space that elevates your vision.
          </p>
          <Link href="/home" passHref>
            <button className="bg-white mt-10 text-blue-500 px-6 py-3 rounded-full font-semibold text-lg shadow-md hover:bg-gray-100 transition duration-300 relative z-30">
              Explore now
            </button>
          </Link>
          <svg viewBox="0 0 320 512" width="100" className="mx-auto mt-6 opacity-25">
            <path d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z" />
          </svg>
        </div>
        <img
          src="https://images.unsplash.com/photo-1471341971476-ae15ff5dd4ea?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Hero background"
          className="absolute left-0 top-0 w-full h-full object-cover opacity-20"
        />
      </div>
    </div>
  );
};

export default Hero;
