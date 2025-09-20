import Container from "@/components/Container";
import React from "react";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Props = {};

const CancellationPolicy = (props: Props) => {

    return (
        <ClientOnly>
            <div className="banner">
                <Image
                    src="/assets/footer-banner.jpg"
                    alt="Banner Image"
                    width={1920}
                    height={400}
                    priority
                />
                <div className="overlay">
                    <h1 className="banner-text">Cancellation Policy</h1>
                </div>
            </div>

      {/* Content Section */}
      <Container>
        <div className="pt-10 pb-32 max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Our Cancellation Policy
            </h2>
            <p className="text-gray-700">
              We understand that plans can change. To ensure transparency and
              fairness, we have outlined our cancellation policy below. Please
              read carefully to understand how cancellations are managed on our
              platform.
            </p>
          </div>

          {/* Timeframes */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Cancellation Timeframes
            </h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <b>Full Refund:</b> Cancellations made at least{" "}
                <b>48 hours</b> before the scheduled booking.
              </li>
              <li>
                <b>Partial Refund:</b> Cancellations made between{" "}
                <b>24 and 48 hours</b> before the scheduled booking will receive
                a <b>50%</b> refund.
              </li>
              <li>
                <b>No Refund:</b> Cancellations made <b>within 24 hours</b> of
                the scheduled booking will not be eligible for a refund.
              </li>
            </ul>
          </div>

          {/* Special Considerations */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Special Considerations
            </h3>
            <p className="text-gray-700">
              In exceptional circumstances such as emergencies or unforeseen
              events, we may evaluate refund requests on a case-by-case basis.
              Documentation may be required for such requests.
            </p>
          </div>

          {/* How to Cancel */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              How to Cancel a Booking
            </h3>
            <ol className="list-decimal pl-5 space-y-2 text-gray-700">
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
          <div className="bg-gray-50 p-6 rounded-2xl shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">
              Refund Process
            </h3>
            <p className="text-gray-700">
              Refunds, if applicable, will be processed back to the original
              payment method within <b>5–7 business days</b>. Please note that
              additional processing time may be required depending on your bank
              or payment provider.
            </p>
          </div>

          {/* Support */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow space-y-4">
            <h3 className="text-xl font-semibold text-gray-800">Need Help?</h3>
            <p className="text-gray-700">
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
