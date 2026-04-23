import Image from "next/image";
import Link from "next/link";

import Container from "@/components/Container";
import EmailShield from "@/components/EmailShield";
import Logo from "@/components/navbar/Logo"

function Footer() {
  return (
    <footer className="bg-muted/30 text-foreground border-t border-border">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-12">
          {/* Left Side */}
          <div className="grid place-items-center md:place-items-start gap-8">
            {/* Logo & Description */}
            <div className="flex flex-col items-center md:items-start w-full gap-2 max-w-md">
              <Logo />
              <p className="text-sm text-muted-foreground text-center md:text-left ">ContCave helps creators discover, compare, and book verified studios and production-ready spaces across India.</p>
            </div>

            {/* Follow Us */}
            <div className="flex items-center gap-4">
              <p className="text-base font-semibold text-center md:text-left">Follow Us</p>
              <div className="flex gap-4 items-center">
                <a href="https://www.linkedin.com/company/contcave/" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/icons/linkedin.png" width={32} height={32} alt="linkedin" className="object-cover hover:scale-105 transition-all contrast-180" />
                </a>
                <a href="https://x.com/contcave/" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/icons/twitter.png" width={32} height={32} alt="twitter" className="object-cover hover:scale-105 transition-all contrast-180" />
                </a>
                <a href="https://www.instagram.com/contcave/" target="_blank" rel="noopener noreferrer">
                  <Image src="/images/icons/instagram.png" width={32} height={32} alt="instagram" className="object-cover hover:scale-105 transition-all contrast-180" />
                </a>
                <a href="https://www.producthunt.com/posts/contcave?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-contcave" target="_blank" rel="noopener noreferrer">
                  <Image src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=480635&theme=dark&t=1738752353649" alt="ContCave - We Help creators and brands Shoot Better Content | Product Hunt" width={150} height={32} className="rounded-xl" />
                </a>
              </div>
            </div>

            {/* Contact Us */}
            <div className="flex flex-col space-x-4 justify-center text-center md:text-left">
              <p className="text-base text-muted-foreground">
                Have a question? Feel free to reach out to us at{" "}
                <EmailShield email="info@contcave.com" className="text-foreground font-semibold underline" />
              </p>
            </div>
          </div>

          {/* Right Side */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-6 text-sm font-medium text-center md:text-left">
            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Company</p>
              <Link href="/about" className="cursor-pointer text-muted-foreground hover:text-foreground transition-all text-sm">About</Link>
              <Link href="/privacy-policy" className="cursor-pointer text-muted-foreground hover:text-foreground transition-all text-sm">Privacy Policy</Link>
              <Link href="/terms-and-conditions" className="cursor-pointer text-muted-foreground hover:text-foreground transition-all text-sm">Terms & Conditions</Link>
              <Link href="/blog" className="cursor-pointer text-muted-foreground hover:text-foreground transition-all text-sm">Blogs</Link>
            </div>

            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Support</p>
              <Link href="/about" className="text-muted-foreground hover:text-foreground transition-all text-sm">Help Center</Link>
              <Link href="/cancellation" className="text-muted-foreground hover:text-foreground transition-all text-sm">Cancellation Policy</Link>
              <EmailShield email="info@contcave.com" className="text-muted-foreground hover:text-foreground transition-all text-sm">Contact Us</EmailShield>
            </div>

            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Activities</p>
              <Link href="/home?category=Photography" className="text-muted-foreground hover:text-foreground transition-all text-sm">Photo Shoot</Link>
              <Link href="/home?category=Filming" className="text-muted-foreground hover:text-foreground transition-all text-sm">Filming Content</Link>
              <Link href="/home?category=Pre-Wedding" className="text-muted-foreground hover:text-foreground transition-all text-sm">Pre-Wedding Shoot</Link>
              <Link href="/home?category=Outdoor" className="text-muted-foreground hover:text-foreground transition-all text-sm">Outdoor Event</Link>
              <Link href="/home?category=Podcast" className="text-muted-foreground hover:text-foreground transition-all text-sm">Podcasts</Link>
              <Link href="/home?category=Party" className="text-muted-foreground hover:text-foreground transition-all text-sm">Party</Link>
              <Link href="/home?category=Meeting" className="text-muted-foreground hover:text-foreground transition-all text-sm">Meetings</Link>
            </div>

            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Across India</p>
              <div className="grid grid-cols-1 gap-2">
                <Link href="/home?locationValue=Delhi" className="text-muted-foreground hover:text-foreground transition-all text-sm">Delhi NCR</Link>
                <Link href="/home?locationValue=Mumbai" className="text-muted-foreground hover:text-foreground transition-all text-sm">Mumbai</Link>
                <Link href="/home?locationValue=Bangalore" className="text-muted-foreground hover:text-foreground transition-all text-sm">Bangalore</Link>
                <Link href="/home?locationValue=Kolkata" className="text-muted-foreground hover:text-foreground transition-all text-sm">Kolkata</Link>
                <Link href="/home?locationValue=Hyderabad" className="text-muted-foreground hover:text-foreground transition-all text-sm">Hyderabad</Link>
                <Link href="/home" className="text-muted-foreground hover:text-foreground transition-all text-sm font-semibold">View All Cities</Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
      {/* Copyright */}
      <div className="bg-foreground text-background py-3 text-[10px] md:text-xs text-center">
        © {new Date().getFullYear()} ContCave by Arkanet Ventures LLP. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;

