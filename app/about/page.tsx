import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import Image from "next/image";
import { Building2, Heart, Users } from "lucide-react";
import Hero from "./hero";
import type { Metadata } from "next";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Learn how ContCave empowers creatives with a curated network of production-ready studios, industry partners, and hands-on support." as const;

export const metadata: Metadata = {
  title: `About ${BRAND_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    title: `About ${BRAND_NAME}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/about`,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `About ${BRAND_NAME}`,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

const About = async () => {
  const currentUser = await getCurrentUser();

  return (
    <ClientOnly>
      {/* Hero Section */}
      {/* <div className="relative h-[40vh] w-full">
        <Image
          src="/assets/footer-banner.jpg"
          fill
          alt="Banner Image"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white text-center max-w-3xl leading-tight">
            Sustaining & Growing <span className="underline">Creative Ecosytem</span>
          </h1>
        </div>
      </div> */}

      <Hero />


      <Container>
        <div className="py-20 space-y-24">
          {/* Founders Note */}
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

          {/* Core Values */}
          <section>
            <h2 className="text-3xl md:text-4xl font-bold text-black text-center mb-14">
              What We Stand For
            </h2>
            <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs hover:shadow-lg transition">
                <Building2 className="mx-auto mb-4 w-10 h-10 text-black" />
                <h3 className="text-xl font-semibold mb-3 text-black">
                  Space Utilisation
                </h3>
                <p className="text-gray-600">
                  No creative space should go to waste — whether it&apos;s a café, a
                  studio, or a hidden corner. Every space can inspire art.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs hover:shadow-lg transition">
                <Heart className="mx-auto mb-4 w-10 h-10 text-black" />
                <h3 className="text-xl font-semibold mb-3 text-black">
                  Sustaining Human Creativity
                </h3>
                <p className="text-gray-600">
                  Technology may evolve, but human creativity is timeless. We
                  exist to give it space, voice, and longevity.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-xs hover:shadow-lg transition">
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

          {/* Vision Timeline */}
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

          {/* Call to Action */}
          <section className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Join the First Wave
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Be part of the movement to make creative spaces in India more
              accessible, celebrated, and sustainable.
            </p>
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSdYngGwgLaHCYcejKqCvwsdhxykFbr2UxxCHdXusQrXDaubWA/viewform"
              target="_blank"
              className="inline-block bg-black text-white px-8 py-3 rounded-xl text-lg font-semibold hover:bg-gray-800 transition"
            >
              Get Involved
            </a>
          </section>
        </div>
      </Container>
    </ClientOnly>
  );
};

export default About;
