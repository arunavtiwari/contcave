import type { Metadata } from "next";
import Image from "next/image";
import React from "react";

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const DESCRIPTION =
  "Understand ContCave's cancellation windows, refund rules, and how to manage changes to your booking with confidence." as const;

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: DESCRIPTION,
  alternates: { canonical: "/cancellation" },
  openGraph: {
    title: "Cancellation Policy",
    description: DESCRIPTION,
    url: `${SITE_URL}/cancellation`,
    siteName: BRAND_NAME,
    type: "article",
    images: [
      {
        url: `${SITE_URL}${OG_IMAGE}`,
        width: 1200,
        height: 630,
        alt: "Cancellation Policy",
      },
    ],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cancellation Policy",
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

const CancellationPolicy = () => {
  return (
    <main>
      <div className="relative h-64 w-full">
        <Image
          src="/assets/banner.jpg"
          alt="ContCave Cancellation Policy"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-white text-4xl font-bold">Cancellation Policy</h1>
        </div>
      </div>

      <Container>
        <div className="max-w-3xl mx-auto py-10">
          <div className="bg-background rounded-2xl shadow-sm border border-border p-6 md:p-8 space-y-5">

            {/* Preamble */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Last Updated: 20 January 2026</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We understand that plans can change. To ensure transparency and fairness, we have outlined our cancellation policy below. Please read carefully to understand how cancellations are managed on our platform.
              </p>
            </div>

            {/* 1. Cancellation Timeframes */}
            <SectionTitle number={1} title="Cancellation Timeframes" />
            <div className="space-y-2">
              <ul className="pl-6 space-y-1 list-disc text-muted-foreground text-sm">
                <li>
                  <strong className="text-foreground">Full Refund (100%)</strong> — Cancellations made at least 48 hours before the scheduled booking.
                </li>
                <li>
                  <strong className="text-foreground">Partial Refund (50%)</strong> — Cancellations made between 24 and 48 hours before the scheduled booking.
                </li>
                <li>
                  <strong className="text-foreground">No Refund (0%)</strong> — Cancellations made within 24 hours of the scheduled booking.
                </li>
              </ul>
            </div>

            {/* 2. Special Considerations */}
            <SectionTitle number={2} title="Special Considerations" />
            <div className="space-y-2">
              <Clause>
                In exceptional circumstances such as emergencies or unforeseen events, we may evaluate refund requests on a case-by-case basis. Documentation may be required for such requests.
              </Clause>
            </div>

            {/* 3. How to Cancel */}
            <SectionTitle number={3} title="How to Cancel a Booking" />
            <div className="space-y-2">
              <ol className="pl-6 space-y-1 list-decimal text-muted-foreground text-sm">
                <li>Log in to your account on our platform.</li>
                <li>Navigate to &quot;My Bookings&quot; in your dashboard.</li>
                <li>Select the booking you wish to cancel.</li>
                <li>Click the &quot;Cancel Booking&quot; button and follow the prompts.</li>
                <li>You will receive an email confirmation once the cancellation is processed.</li>
              </ol>
            </div>

            {/* 4. Refund Process */}
            <SectionTitle number={4} title="Refund Process" />
            <div className="space-y-2">
              <Clause>
                Refunds, if applicable, will be processed back to the original payment method within <strong>5–7 business days</strong>. Please note that additional processing time may be required depending on your bank or payment provider.
              </Clause>
            </div>

            {/* 5. Contact Us */}
            <SectionTitle number={5} title="Contact Us" />
            <div className="space-y-2">
              <Clause>
                If you have questions or concerns about cancellations or refunds, please contact our support team at:
              </Clause>
              <div className="bg-muted rounded-lg p-4 text-sm text-foreground space-y-1 border border-border">
                <p><strong>Email:</strong> <a href="mailto:info@contcave.com" className="text-primary hover:underline">info@contcave.com</a></p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-4 mt-6">
              <p className="text-xs text-muted-foreground text-center">
                Cancellation and refund policies are designed to be fair to both Hosts and Clients.
              </p>
            </div>

          </div>
        </div>
      </Container>
    </main>
  );
};

export default CancellationPolicy;
