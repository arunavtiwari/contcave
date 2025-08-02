import Blog from "@/components/Blog";
import Contact from "@/components/Contact";
import CTA from "@/components/CTA";
import Cover from "@/components/Cover";
import FAQ from "@/components/FAQ";
import Feature from "@/components/Features";
import FeaturesTab from "@/components/FeaturesTab";
import FunFact from "@/components/FunFact";
import Hero from "@/components/Hero";

export const metadata = {
  title: "ContCave | Find the Perfect Shoot Space with Ease",
  description:
    "Book the ideal shoot space for your next project on ContCave – the leading platform for creative studio and event space rentals.",
  keywords: [
    "studio booking",
    "photography studio rental",
    "event space rental",
    "creative space booking",
    "shoot locations",
    "ContCave",
  ],
  alternates: {
    canonical: "https://www.contcave.com",
  },
  openGraph: {
    title: "ContCave | Find the Perfect Shoot Space with Ease",
    description:
      "Discover creative studios, photography spaces, and event rentals across India with ContCave.",
    url: "https://www.contcave.com",
    siteName: "ContCave",
    type: "website",
    images: [
      {
        url: "https://www.contcave.com/images/logo/logo-dark.png",
        width: 1200,
        height: 630,
        alt: "ContCave Banner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ContCave | Find the Perfect Shoot Space with Ease",
    description:
      "Book the ideal shoot space for your next project with ContCave.",
    site: "@ContCave",
    creator: "@ContCave",
    images: ["https://www.contcave.com/images/logo/logo-dark.png"],
  },
};

export default function Home() {
  return (
    <main>
      <Hero />
      <Feature />
      <FeaturesTab />
      <FunFact />
      <FAQ />
      <CTA />
      {/* Optional components */}
      {/* <Cover /> */}
      {/* <Contact /> */}
      {/* <Blog /> */}
    </main>
  );
}