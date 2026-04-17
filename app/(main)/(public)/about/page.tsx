import Building2 from "lucide-react/dist/esm/icons/building-2";
import Heart from "lucide-react/dist/esm/icons/heart";
import Users from "lucide-react/dist/esm/icons/users";
import type { Metadata } from "next";
import React from "react";

import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

import Hero from "./hero";



const DESCRIPTION =
  "Learn how ContCave empowers creatives with a curated network of production-ready studios, industry partners, and hands-on support." as const;

export const metadata: Metadata = {
  title: "About Us",
  description: DESCRIPTION,
  keywords: [
    "ContCave about",
    "studio marketplace",
    "creative platform India",
    "Arkanet Ventures",
  ],
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us",
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: BRAND_NAME,
    type: "website",
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: `About ${BRAND_NAME}`,
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Us",
    description: DESCRIPTION,
    site: "@ContCave",
    creator: "@ContCave",
    images: [`${SITE_URL}${OG_IMAGE}`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

const About = async () => {

  return (
    <main>
      <ClientOnly>



        <Hero />


        <Container>
          <div className="py-20 space-y-24">

            <section className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
                Our Story
              </h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                We started <strong>ContCave</strong> with one belief: no creative
                idea should be left unrealized just because the right space wasn&apos;t
                accessible. Every café corner, every studio, every underused nook
                deserves a chance to tell a story.
              </p>
              <p className="text-gray-700 text-lg leading-relaxed mt-6">
                As part of <strong>Arkanet Ventures LLP</strong>, our mission is
                to sustain, drive, and grow human art by making creative spaces
                discoverable, accessible, and celebrated.
              </p>
            </section>


            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-14">
                What We Stand For
              </h2>
              <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center  hover: transition">
                  <Building2 className="mx-auto mb-4 w-10 h-10 text-black" />
                  <h3 className="text-xl font-semibold mb-3 text-black">
                    Space Utilisation
                  </h3>
                  <p className="text-gray-600">
                    No creative space should go to waste — whether it&apos;s a café, a
                    studio, or a hidden corner. Every space can inspire art.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center  hover: transition">
                  <Heart className="mx-auto mb-4 w-10 h-10 text-black" />
                  <h3 className="text-xl font-semibold mb-3 text-black">
                    Sustaining Human Creativity
                  </h3>
                  <p className="text-gray-600">
                    Technology may evolve, but human creativity is timeless. We
                    exist to give it space, voice, and longevity.
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center  hover: transition">
                  <Users className="mx-auto mb-4 w-10 h-10 text-black" />
                  <h3 className="text-xl font-semibold mb-3 text-black">
                    Community First
                  </h3>
                  <p className="text-gray-600">
                    Our vision is to build a community where creators support each
                    other, share spaces, and thrive together.
                  </p>
                </div>
              </div>
            </section>


            <section>
              <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-14">
                Our Vision
              </h2>
              <div className="relative border-l-2 border-gray-300 max-w-3xl mx-auto">
                <div className="mb-12 ml-8">
                  <span className="absolute -left-3 w-6 h-6 bg-black rounded-full"></span>
                  <h3 className="text-xl font-semibold text-black">
                    2024 – The Spark
                  </h3>
                  <p className="text-gray-600">
                    We saw creators struggling to find affordable, accessible
                    spaces for storytelling.
                  </p>
                </div>
                <div className="mb-12 ml-8">
                  <span className="absolute -left-3 w-6 h-6 bg-black rounded-full"></span>
                  <h3 className="text-xl font-semibold text-black">
                    2025 – The Launch
                  </h3>
                  <p className="text-gray-600">
                    ContCave was born: a platform to repurpose every creative
                    corner into a canvas.
                  </p>
                </div>
                <div className="ml-8">
                  <span className="absolute -left-3 w-6 h-6 bg-black rounded-full"></span>
                  <h3 className="text-xl font-semibold text-black">
                    What&apos;s ahead of us?
                  </h3>
                  <p className="text-gray-600">
                    A community-led ecosystem where art sustains, drives, and
                    grows, powered by shared spaces and human stories.
                  </p>
                </div>
              </div>
            </section>


            <section className="text-center pb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Join the First Wave
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-10 text-lg">
                Be part of the movement to make creative spaces in India more
                accessible, celebrated, and sustainable.
              </p>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSdYngGwgLaHCYcejKqCvwsdhxykFbr2UxxCHdXusQrXDaubWA/viewform"
                target="_blank"
                className="inline-block bg-primary text-white px-10 py-4 rounded-xl text-lg font-bold hover:opacity-90 transition tracking-accent"
              >
                Get Involved
              </a>
            </section>
          </div>
        </Container>
      </ClientOnly>
    </main>
  );
};

export default About;
