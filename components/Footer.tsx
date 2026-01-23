import Image from "next/image";
import Link from "next/link";
import React from "react";

import Logo from "@/components/navbar/Logo"

function Footer() {
  return (
    <>
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-10 px-10 lg:px-20 py-15 bg-gray-100 text-gray-600 mt-20"
      >
        {/* Left Part */}
        <div className="grid place-items-center md:place-items-start gap-8">
          <Logo />

          <div className="flex flex-col space-y-2">
            <p className="text-base font-semibold text-center md:text-start">Subscribe to our newsletter</p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <input type="email" placeholder="Enter your email" className="border py-2 px-4 rounded-full" />
              <button className="bg-black text-white px-8 py-2 rounded-full hover:opacity-90 cursor-pointer">Subscribe</button>
            </div>
          </div>

          {/* Social Media */}
          <div className="flex flex-wrap justify-center sm:justify-normal gap-4 items-center w-full">
            <p className="text-base font-semibold">Follow Us</p>
            <a href="https://www.linkedin.com/company/contcave/?viewAsMember=true" target="_blank" rel="noopener noreferrer">
              <Image src="/images/icon/Linkedin.svg" width={25} height={25} alt="linkedin" className="object-cover hover:scale-105 transition-all" />
            </a>
            <a href="https://x.com/contcave/" target="_blank" rel="noopener noreferrer">
              <Image src="/images/icon/Twitter.svg" width={25} height={25} alt="twitter" className="object-cover hover:scale-105 transition-all" />
            </a>
            <a href="https://www.instagram.com/contcave/" target="_blank" rel="noopener noreferrer">
              <Image src="/images/icon/Instagram.svg" width={25} height={25} alt="instagram" className="object-cover hover:scale-105 transition-all" />
            </a>
            <a href="https://www.producthunt.com/posts/contcave?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-contcave" target="_blank" rel="noopener noreferrer">
              <Image src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=480635&theme=dark&t=1738752353649" alt="ContCave - We Help creators and brands Shoot Better Content | Product Hunt" width={250} height={54} className="rounded-full" style={{ width: 'auto', height: 'auto' }} />
            </a>
          </div>

          <div className="flex space-x-4 justify-center text-center md:text-left">
            <p className="text-base text-black">
              Have a question? Feel free to reach out to us at{" "}
              <a href="mailto:info@contcave.com" className="text-blue-500 underline">
                info@contcave.com
              </a>
            </p>
          </div>

        </div>

        {/* Right Part */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-8 text-base font-medium text-center">
          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Company</p>
            <Link href="/about" className="cursor-pointer text-btndark/80 hover:text-black transition-all">About</Link>
            <Link href="/privacy-policy" className="cursor-pointer text-btndark/80 hover:text-black transition-all">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="cursor-pointer text-btndark/80 hover:text-black transition-all">Terms & Conditions</Link>
            <Link href="/blog" className="cursor-pointer text-btndark/80 hover:text-black transition-all">Blogs</Link>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Support</p>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Help Center</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Guidelines</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">FAQ</a>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Activities</p>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Photo Shoot</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Filming Content</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Pre-Wedding Shoot</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Outdoor Event</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Podcasts</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Party</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Meetings</a>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Cities</p>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Delhi</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Mumbai</a>
            <a href="#" className="text-btndark/80 hover:text-black transition-all">Kolkata</a>
          </div>
        </div>

        {/* <p className="text-sm md:col-span-5 hidden">{country}</p> */}
      </div>
      <div className="bg-black text-white py-2 text-sm text-center">
        © 2025 ContCave by Arkanet Ventures LLP. All rights reserved.
      </div>
    </>
  );
}

export default Footer;
