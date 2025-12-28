import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import type { Metadata } from "next";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Cancellation Policy | ${BRAND_NAME}`,
  description:
    "Understand ContCave's cancellation windows, refund rules, and how to manage changes to your booking with confidence.",
  alternates: { canonical: "/cancellation" },
  openGraph: {
    title: `Cancellation Policy | ${BRAND_NAME}`,
    description:
      "Review the cancellation timeframes and refund process for bookings made through ContCave.",
    url: `${SITE_URL}/cancellation`,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `Cancellation Policy | ${BRAND_NAME}`,
    description:
      "Understand the timelines and process for cancelling or rescheduling ContCave bookings.",
    images: [OG_IMAGE],
  },
};

const CancellationPolicy = () => {
  return (
    <div className="flex flex-col">
      {/* Banner Section */}
      <div className="relative w-full h-[400px] md:h-[500px]">
        <Image
          src="/assets/footer-banner.jpg"
          alt="Banner Image"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white text-center px-4">
            Cancellation Policy
          </h1>
        </div>
      </div>

      {/* Content Section */}
      <Container>
        <div className="pt-16 pb-32 max-w-4xl mx-auto space-y-10">
          {/* Intro */}
          <div className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">
              Our Cancellation Policy
            </h2>
            <p className="text-gray-700 text-lg">
              We understand that plans can change. To ensure transparency and
              fairness, we have outlined our cancellation policy below. Please
              read carefully to understand how cancellations are managed on our
              platform.
            </p>
          </div>

          {/* Timeframes */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">
              Cancellation Timeframes
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-gray-700 text-lg">
              <li>
                <b>Full Refund:</b> Cancellations made at least <b>48 hours</b>{" "}
                before the scheduled booking.
              </li>
              <li>
                <b>Partial Refund:</b> Cancellations made between <b>24 and 48
                  hours</b> before the scheduled booking will receive a{" "}
                <b>50%</b> refund.
              </li>
              <li>
                <b>No Refund:</b> Cancellations made <b>within 24 hours</b> of
                the scheduled booking will not be eligible for a refund.
              </li>
            </ul>
          </div>

          {/* Special Considerations */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">
              Special Considerations
            </h3>
            <p className="text-gray-700 text-lg">
              In exceptional circumstances such as emergencies or unforeseen
              events, we may evaluate refund requests on a case-by-case basis.
              Documentation may be required for such requests.
            </p>
          </div>

          {/* How to Cancel */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">
              How to Cancel a Booking
            </h3>
            <ol className="list-decimal pl-6 space-y-2 text-gray-700 text-lg">
              <li>Log in to your account on our platform.</li>
              <li>Navigate to "My Bookings" in your dashboard.</li>
              <li>Select the booking you wish to cancel.</li>
              <li>Click the "Cancel Booking" button and follow the prompts.</li>
              <li>
                You will receive an email confirmation once the cancellation is
                processed.
              </li>
            </ol>
          </div>

          {/* Refund Process */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">
              Refund Process
            </h3>
            <p className="text-gray-700 text-lg">
              Refunds, if applicable, will be processed back to the original
              payment method within <b>5–7 business days</b>. Please note that
              additional processing time may be required depending on your bank
              or payment provider.
            </p>
          </div>

          {/* Support */}
          <div className="bg-gray-50 p-8 rounded-2xl shadow space-y-4">
            <h3 className="text-2xl font-semibold text-gray-900">Need Help?</h3>
            <p className="text-gray-700 text-lg">
              If you have questions or concerns about cancellations or refunds,
              please contact our support team at{" "}
              <a
                href="mailto:info@contcave.com"
                className="text-blue-600 font-medium hover:underline"
              >
                info@contcave.com
              </a>
              . We are here to help.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default CancellationPolicy;
