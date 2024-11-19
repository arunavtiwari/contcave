"use client";
import Logo from "@/components/navbar/Logo";
import React, { useEffect, useState } from "react";
import ClientOnly from "../components/ClientOnly";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Props = {};

function Footer() {
  const [country, setCountry] = useState("India");
  const [isChatPage, setIsChatPage] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (window.location.href.includes("chat")) {
      setIsChatPage(true);
    }

    fetch(`https://extreme-ip-lookup.com/json/?key=${process.env.NEXT_PUBLIC_LOOKUP_KEY}`)
      .then((res) => res.json())
      .then((data) => setCountry(data.country));
  }, []);

  return (
    <ClientOnly>
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-y-10 px-20 py-15 bg-gray-100 text-gray-600 ${isChatPage ? '' : 'mt-20'}`}
      >
        {/* Left Part */}
        <div>
          <div className="md:col-span-1 grid grid-rows-auto-1 gap-y-8">
            <div className="md:col-span-1">
              <Logo />
            </div>

            <div className="md:col-span-1 flex flex-col space-y-2">
              <p className="text-base font-semibold">Subscribe to our newsletter</p>
              <div className="flex items-center space-x-4">
                <input type="email" placeholder="Enter your email" className="border py-2 px-4 rounded-full" />
                <button className="bg-black text-white px-8 py-2 rounded-full hover:opacity-90">Subscribe</button>
              </div>
            </div>

            {/* Social Media */}
            <div className="md:col-span-1 flex items-center space-x-4">
              <p className="text-base font-semibold">Follow Us</p>
              <a href="https://www.linkedin.com/company/contcave/?viewAsMember=true" target="_blank" rel="noopener noreferrer">
                <Image src="images/icon/Linkedin.svg" width={25} height={25} alt="linkedin" className="object-cover hover:scale-105 transition-all" />
              </a>
              <a href="https://x.com/contcave/" target="_blank" rel="noopener noreferrer">
                <Image src="images/icon/Twitter.svg" width={25} height={25} alt="twitter" className="object-cover hover:scale-105 transition-all" />
              </a>
              <a href="https://www.instagram.com/contcave/" target="_blank" rel="noopener noreferrer">
                <Image src="images/icon/Instagram.svg" width={25} height={25} alt="instagram" className="object-cover hover:scale-105 transition-all" />
              </a>
            </div>

            <div className="md:col-span-1 flex items-center space-x-4">
              <p className="text-base text-black">
                Have a question? Feel free to reach out to us at{" "}
                <a href="mailto:support@contcave.tech" className="text-blue-500 underline">
                  info@contcave.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Right Part */}
        <div className="flex justify-between gap-y-10 text-base font-medium">
          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black mb-3">Company</p>
            <a onClick={() => { router.push("/about") }} className="cursor-pointer text-btndark/80 hover:text-black transition-all">About</a>
            <a onClick={() => { router.push("/policy") }} className="cursor-pointer text-btndark/80 hover:text-black transition-all">Privacy Policy</a>
            <a onClick={() => { router.push("/terms") }} className="cursor-pointer text-btndark/80 hover:text-black transition-all">Terms & Conditions</a>
            <a onClick={() => { router.push("/blogs") }} className="cursor-pointer text-btndark/80 hover:text-black transition-all">Blogs</a>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black mb-3">Support</p>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Help Center</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Guidelines</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">FAQ</a>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black mb-3">Activities</p>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Photo Shoot</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Filming Content</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Pre-Wedding Shoot</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Outdoor Event</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Podcasts</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Party</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Meetings</a>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black mb-3">Cities</p>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Delhi</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Mumbai</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Kolkata</a>
          </div>
        </div>

        <p className="text-sm md:col-span-5 hidden">{country}</p>
      </div>
    </ClientOnly>
  );
}

export default Footer;
