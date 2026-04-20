import type { Metadata } from "next";

import ContentLayout from "@/components/ui/ContentLayout";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "Understand ContCave's cancellation windows, refund rules, and how to manage changes to your booking with confidence.",
  alternates: { canonical: "/cancellation" },
  openGraph: {
    title: "Cancellation Policy",
    description:
      "Review the cancellation timeframes and refund process for bookings made through ContCave.",
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
    description:
      "Understand the timelines and process for cancelling or rescheduling ContCave bookings.",
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

const CancellationPolicy = () => {
  return (
    <ContentLayout
      title="Cancellation Policy"
      subtitle="Last updated: January 20, 2026"
    >
      <section>
        <p>
          We understand that plans can change. To ensure transparency and
          fairness, we have outlined our cancellation policy below. Please
          read carefully to understand how cancellations are managed on our
          platform.
        </p>
      </section>

      <section>
        <h2>1. Cancellation Timeframes</h2>
        <ul>
          <li>
            <strong>Full Refund (100%)</strong> — Cancellations made at least
            48 hours before the scheduled booking.
          </li>
          <li>
            <strong>Partial Refund (50%)</strong> — Cancellations made between
            24 and 48 hours before the scheduled booking.
          </li>
          <li>
            <strong>No Refund (0%)</strong> — Cancellations made within 24
            hours of the scheduled booking.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Special Considerations</h2>
        <p>
          In exceptional circumstances such as emergencies or unforeseen
          events, we may evaluate refund requests on a case-by-case basis.
          Documentation may be required for such requests.
        </p>
      </section>

      <section>
        <h2>3. How to Cancel a Booking</h2>
        <ol>
          <li>Log in to your account on our platform.</li>
          <li>Navigate to &quot;My Bookings&quot; in your dashboard.</li>
          <li>Select the booking you wish to cancel.</li>
          <li>
            Click the &quot;Cancel Booking&quot; button and follow the
            prompts.
          </li>
          <li>
            You will receive an email confirmation once the cancellation is
            processed.
          </li>
        </ol>
      </section>

      <section>
        <h2>4. Refund Process</h2>
        <p>
          Refunds, if applicable, will be processed back to the original
          payment method within <strong>5–7 business days</strong>. Please
          note that additional processing time may be required depending on
          your bank or payment provider.
        </p>
      </section>

      <section>
        <h2>5. Contact Us</h2>
        <p>
          If you have questions or concerns about cancellations or refunds,
          please contact our support team at:{" "}
          <a
            href="mailto:info@contcave.com"
            className="text-primary font-medium hover:underline transition-colors"
          >
            info@contcave.com
          </a>
        </p>
      </section>
    </ContentLayout>
  );
};

export default CancellationPolicy;
