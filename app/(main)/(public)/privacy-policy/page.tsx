import type { Metadata } from 'next';
import Image from 'next/image';
import React from 'react';

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const DESCRIPTION = "Learn how ContCave handles your personal information, data security, and privacy across our platform and services." as const;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy-policy" },
  openGraph: {
    title: "Privacy Policy",
    description: DESCRIPTION,
    url: `${SITE_URL}/privacy-policy`,
    siteName: BRAND_NAME,
    type: 'article',
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: "Privacy Policy",
      },
    ],
    locale: 'en_IN',
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
      'max-image-preview': 'large',
    },
  },
};

const PrivacyPolicy = () => {
  return (
    <main className="bg-background min-h-screen">
      {/* Header Section */}
      <div className="relative h-64 w-full">
        <Image
          src="/assets/banner.jpg"
          alt="ContCave Privacy Policy"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
          <h1 className="text-background text-4xl font-bold uppercase tracking-accent">Privacy Policy</h1>
        </div>
      </div>

      {/* Content Section */}
      <section className="py-16">
        <Container>
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              This Privacy Policy applies to <strong>ContCave</strong>, a platform operated by <strong>ContCave Technologies Private Limited</strong>. We are committed to protecting your personal information and your right to privacy.
            </p>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">1. Information We Collect</h3>
              <p className="text-muted-foreground leading-relaxed">
                We collect personal information that you voluntarily provide to us when you register on the platform, express an interest in obtaining information about us or our products and services, when you participate in activities on the platform, or otherwise when you contact us.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">2. How We Use Your Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use personal information collected via our platform for a variety of business purposes described below:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li>To facilitate account creation and logon process.</li>
                <li>To send administrative information to you.</li>
                <li>To fulfill and manage your bookings.</li>
                <li>To protect our platform and services.</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">3. Sharing Your Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">4. Cookie Policy</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may use cookies and similar tracking technologies to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Policy.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-xl font-bold text-foreground">5. Data Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                We aim to protect your personal information through a system of organizational and technical security measures. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.
              </p>
            </div>

            <div className="space-y-4 border-t border-border pt-8 mt-12">
              <h3 className="text-xl font-bold text-foreground">6. Contact Us</h3>
              <p className="text-muted-foreground">
                If you have questions or comments about this policy, you may email us at <strong className="text-foreground">info@contcave.com</strong>.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
};

export default PrivacyPolicy;
