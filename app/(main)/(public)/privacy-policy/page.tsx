import type { Metadata } from "next";
import Image from "next/image";
import React from "react";

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const DESCRIPTION =
  "Learn how ContCave handles your personal information, data security, and privacy across our platform and services." as const;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy",
    description: DESCRIPTION,
    url: `${SITE_URL}/privacy-policy`,
    siteName: BRAND_NAME,
    type: "article",
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: "Privacy Policy",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy",
    description: DESCRIPTION,
    site: "@ContCave",
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

const SectionTitle = ({ number, title }: { number: number; title: string }) => (
  <h3 className="text-xl font-semibold text-foreground pt-4">
    {number}. {title}
  </h3>
);

const Clause = ({ id, children }: { id?: string; children: React.ReactNode }) => (
  <p className="text-muted-foreground text-sm leading-relaxed">
    {id && <span className="font-medium text-foreground">{id}</span>} {children}
  </p>
);

const PrivacyPolicy = () => {
  return (
    <main>
      <div className="relative h-64 w-full">
        <Image
          src="/assets/banner.jpg"
          alt="ContCave Privacy Policy"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-white text-4xl font-bold">Privacy Policy</h1>
        </div>
      </div>

      <Container>
        <div className="max-w-3xl mx-auto py-10">
          <div className="bg-background rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-5">

            {/* Preamble */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Last Updated: 20 October 2025</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                This Privacy Policy applies to <strong>ContCave</strong>, a platform operated by <strong>Arkanet Ventures LLP</strong>. We are committed to protecting your personal information and your right to privacy.
              </p>
            </div>

            {/* 1. Information We Collect */}
            <SectionTitle number={1} title="Information We Collect" />
            <div className="space-y-2">
              <Clause>
                We collect personal information that you voluntarily provide to us when you register on the platform, express an interest in obtaining information about us or our products and services, when you participate in activities on the platform, or otherwise when you contact us.
              </Clause>
            </div>

            {/* 2. How We Use Information */}
            <SectionTitle number={2} title="How We Use Your Information" />
            <div className="space-y-2">
              <Clause>
                We use personal information collected via our platform for a variety of business purposes:
              </Clause>
              <ul className="pl-6 space-y-1 list-disc text-muted-foreground text-sm">
                <li>To facilitate account creation and logon process.</li>
                <li>To send administrative information to you.</li>
                <li>To fulfill and manage your bookings.</li>
                <li>To protect our platform and services.</li>
              </ul>
            </div>

            {/* 3. Sharing Information */}
            <SectionTitle number={3} title="Sharing Your Information" />
            <div className="space-y-2">
              <Clause>
                We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
              </Clause>
            </div>

            {/* 4. Cookie Policy */}
            <SectionTitle number={4} title="Cookie Policy" />
            <div className="space-y-2">
              <Clause>
                We may use cookies and similar tracking technologies to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Policy.
              </Clause>
            </div>

            {/* 5. Data Security */}
            <SectionTitle number={5} title="Data Security" />
            <div className="space-y-2">
              <Clause>
                We aim to protect your personal information through a system of organizational and technical security measures. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
              </Clause>
            </div>

            {/* 6. Contact Us */}
            <SectionTitle number={6} title="Contact Us" />
            <div className="space-y-2">
              <Clause>
                If you have questions or comments about this policy, you may email us at:
              </Clause>
              <div className="bg-muted rounded-lg p-4 text-sm text-foreground space-y-1 border border-border">
                <p><strong>Email:</strong> <a href="mailto:info@contcave.com" className="text-primary hover:underline">info@contcave.com</a></p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-4 mt-6">
              <p className="text-xs text-muted-foreground text-center">
                Your privacy is important to us. These policies describe how your data is handled.
              </p>
            </div>

          </div>
        </div>
      </Container>
    </main>
  );
};

export default PrivacyPolicy;
