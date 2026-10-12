import Image from "next/image";

import Container from "@/components/layout/Container";
import Logo from "@/components/navbar/Logo";
import EmailShield from "@/components/ui/EmailShield";
import TextLink from "@/components/ui/TextLink";
import { placeIndex, popularSearches } from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";

const POPULAR_SEARCHES = 8;

async function Footer() {
  const { all: places, covered } = await placeIndex();
  const searches = popularSearches(covered, POPULAR_SEARCHES);

  return (
    <footer className="bg-muted/30 text-foreground border-t border-border">
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 py-12">
          {/* Left Side */}
          <div className="grid place-items-center md:place-items-start gap-8">
            {/* Logo & Description */}
            <div className="flex flex-col items-center md:items-start w-full gap-2 max-w-md">
              <Logo />
              <p className="text-sm text-muted-foreground text-center md:text-left">
                ContCave helps creators discover, compare, and book verified studios and production-ready spaces across India.
              </p>
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
              <TextLink variant="muted" href="/about">About</TextLink>
              <TextLink variant="muted" href="/privacy-policy">Privacy Policy</TextLink>
              <TextLink variant="muted" href="/terms-and-conditions">Terms & Conditions</TextLink>
              <TextLink variant="muted" href="/blog">Blogs</TextLink>
            </div>

            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Support</p>
              <TextLink variant="muted" rel="noopener noreferrer" target="_blank" href="https://great-nova-7ea.notion.site/26d01ecdcb528023ad9fffbb25a4f65a?v=26d01ecdcb5280399b81000c9996a2e7">For Studio Owners</TextLink>
              <TextLink variant="muted" href="/cancellation">Cancellation Policy</TextLink>
              <EmailShield email="info@contcave.com" className="text-muted-foreground hover:text-foreground transition-all text-sm">Contact Us</EmailShield>
            </div>

            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Popular Searches</p>
              {searches.map((search) => (
                <TextLink key={search.href} variant="muted" href={search.href}>{search.label}</TextLink>
              ))}
            </div>

            <div className="flex flex-col space-y-3">
              <p className="text-lg font-bold text-foreground">Across India</p>
              <div className="grid grid-cols-1 gap-2">
                <TextLink variant="muted" href="/studios">All studios</TextLink>
                {places.map((place) => (
                  <TextLink key={place.slug} variant="muted" href={cityPath(place.city)}>{place.city}</TextLink>
                ))}
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
