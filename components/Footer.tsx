import Image from "next/image";
import Link from "next/link";
import React from "react";

import Logo from "@/components/navbar/Logo"

function Footer() {
  return (
    <>
      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-10 px-6 md:px-10 lg:px-20 py-12 bg-gray-100 text-gray-600"
      >
        <div className="grid place-items-center md:place-items-start gap-8">
          <Logo />

          <div className="flex flex-col space-y-2">
            <p className="text-base font-semibold text-center md:text-start">Subscribe to our newsletter</p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <input type="email" placeholder="Enter your email" className="border py-2 px-4 rounded-full" />
              <button className="bg-black text-white px-8 py-2 rounded-full hover:opacity-90 cursor-pointer">Subscribe</button>
            </div>
          </div>

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

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 text-sm font-medium text-center md:text-left">
          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Company</p>
            <Link href="/about" className="cursor-pointer text-btndark/80 hover:text-black transition-all">About</Link>
            <Link href="/privacy-policy" className="cursor-pointer text-btndark/80 hover:text-black transition-all">Privacy Policy</Link>
            <Link href="/terms-and-conditions" className="cursor-pointer text-btndark/80 hover:text-black transition-all">Terms & Conditions</Link>
            <Link href="/blog" className="cursor-pointer text-btndark/80 hover:text-black transition-all">Blogs</Link>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Support</p>
            <Link href="/about" className="text-btndark/80 hover:text-black transition-all">Help Center</Link>
            <Link href="/cancellation" className="text-btndark/80 hover:text-black transition-all">Cancellation Policy</Link>
            <a href="mailto:info@contcave.com" className="text-btndark/80 hover:text-black transition-all">Contact Us</a>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Activities</p>
            <Link href="/home?category=Photography" className="text-btndark/80 hover:text-black transition-all">Photo Shoot</Link>
            <Link href="/home?category=Filming" className="text-btndark/80 hover:text-black transition-all">Filming Content</Link>
            <Link href="/home?category=Pre-Wedding" className="text-btndark/80 hover:text-black transition-all">Pre-Wedding Shoot</Link>
            <Link href="/home?category=Outdoor" className="text-btndark/80 hover:text-black transition-all">Outdoor Event</Link>
            <Link href="/home?category=Podcast" className="text-btndark/80 hover:text-black transition-all">Podcasts</Link>
            <Link href="/home?category=Party" className="text-btndark/80 hover:text-black transition-all">Party</Link>
            <Link href="/home?category=Meeting" className="text-btndark/80 hover:text-black transition-all">Meetings</Link>
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-xl font-bold text-black">Across India</p>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/home?locationValue=Delhi" className="text-btndark/80 hover:text-black transition-all">Delhi NCR</Link>
              <Link href="/home?locationValue=Mumbai" className="text-btndark/80 hover:text-black transition-all">Mumbai</Link>
              <Link href="/home?locationValue=Bangalore" className="text-btndark/80 hover:text-black transition-all">Bangalore</Link>
              <Link href="/home?locationValue=Kolkata" className="text-btndark/80 hover:text-black transition-all">Kolkata</Link>
              <Link href="/home?locationValue=Hyderabad" className="text-btndark/80 hover:text-black transition-all">Hyderabad</Link>
              <Link href="/home" className="text-btndark/80 hover:text-black transition-all font-semibold italic">View All Cities</Link>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-black text-white py-2 text-sm text-center">
        © {new Date().getFullYear()} ContCave by Arkanet Ventures LLP. All rights reserved.
      </div>
    </>
  );
}

export default Footer;
