"use client";
import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from 'next/image'
import { useRouter } from "next/navigation";

gsap.registerPlugin(ScrollTrigger);

const Hero = () => {
  const router = useRouter();
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
    <div id="hero-anim-track" className="overflow-hidden">
      <div className="hero flex items-center text-white relative h-[calc(100vh-80px)] justify-center">
        {/* Overlay */}
        <div className="absolute inset-0 bg-black opacity-65 z-10"></div>

        <div className="container flex flex-col z-20">
          <div className="w-full sm:w-2/3 text-center sm:text-start px-4 sm:px-0">
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
              Discover the perfect
            </h1>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold">
              <span id="changing-text">Studio</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl opacity-70 mt-4">
              Whether you're telling a story or capturing a moment, find the space that elevates your vision.
            </p>
            <button
              onClick={() => router.push('/home')}
              className="bg-white mt-10 w-fit text-black px-6 py-2.5 rounded-full font-semibold text-lg shadow-md hover:scale-105 duration-300 relative z-20"
            >
              Book Now
            </button>
          </div>
        </div>

        <Image
          src="/images/hero/bg-hero.jpg"
          alt="Hero background"
          fill
          className="object-cover"
        />
      </div>
    </div>

  );
};

export default Hero;
