"use client";
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  useEffect(() => {
    let tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#hero-anim-track',
        start: '50% 50%',
        end: '+=200px',
        scrub: 1,
      },
    });

    tl.to('#hero-anim-track', {
      scale: 0.9,
      borderRadius: "2em",
      duration: 1.5,
    })

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
      <div className="hero flex items-end min-h-screen text-white relative">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black opacity-70 z-10"></div>

        <div className="txt w-full px-4 py-35 m-10 flex flex-col relative z-20 align-middle">
          <h1 className="text-7xl font-bold">
            Discover the perfect
          </h1>
          <h1 className="text-7xl font-bold"><span id="changing-text">Studio</span></h1>
          <p className="text-2xl opacity-70 mt-4">
            Whether you’re telling a story or capturing a moment, find the space that elevates your vision.
          </p>
          <Link href="/home" passHref>
            <button className="bg-white mt-10 text-black px-6 py-3 rounded-full font-semibold text-lg shadow-md hover:bg-gray-100 transition duration-300 relative z-20">
              Explore now
            </button>
          </Link>
        </div>

        <img
          src="https://plus.unsplash.com/premium_photo-1663091946297-8050202e1a63?q=80&w=3270&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Hero background"
          className="absolute left-0 top-0 w-full h-full object-cover"
        />
      </div>
    </div>

  );
};

export default Hero;
