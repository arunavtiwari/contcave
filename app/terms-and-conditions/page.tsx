import type { Metadata } from "next";
import Image from "next/image";
import React from "react";

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const DESCRIPTION =
    "Review the terms, acceptable use, and booking policies that govern access to ContCave's studio marketplace." as const;

export const metadata: Metadata = {
    title: "Terms & Conditions",
    description: DESCRIPTION,
    alternates: { canonical: "/terms-and-conditions" },
    openGraph: {
        title: "Terms & Conditions",
        description: DESCRIPTION,
        url: `${SITE_URL}/terms-and-conditions`,
        siteName: BRAND_NAME,
        type: "article",
        images: [
            {
                url: `${SITE_URL}${OG_IMAGE}`,
                width: 1200,
                height: 630,
                alt: "Terms & Conditions",
            },
        ],
        locale: "en_IN",
    },
    twitter: {
        card: "summary_large_image",
        title: "Terms & Conditions",
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

const TermsAndConditions = () => {
    return (
        <main>
            <div className="relative h-64 w-full">
                <Image
                    src="/assets/footer-banner.jpg"
                    alt="ContCave Terms and Conditions"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <h1 className="text-white text-4xl font-bold">Terms & Conditions</h1>
                </div>
            </div>

            <Container>
                <div className="max-w-3xl mx-auto py-10">
                    <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
                        <p className="text-gray-700">
                            Welcome to ContCave. By accessing or using our platform, you agree
                            to comply with these Terms & Conditions. Please read them
                            carefully.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            1. Use of Our Platform
                        </h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>You must be at least <b>18 years old</b> to use our services.</li>
                            <li>
                                Users are responsible for ensuring the accuracy of their
                                account and listing details.
                            </li>
                            <li>
                                Any misuse, fraudulent activity, or violation of laws will
                                result in account suspension or termination.
                            </li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">
                            2. Bookings & Payments
                        </h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>
                                All bookings are subject to availability and confirmation.
                            </li>
                            <li>
                                Payments must be made through our secure payment gateway.
                            </li>
                            <li>
                                Service fees, if applicable, are non-refundable.
                            </li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">
                            3. Cancellations & Refunds
                        </h3>
                        <p className="text-gray-700">
                            Cancellations and refunds are subject to our{" "}
                            <a href="/cancellation" className="text-blue-600 underline">
                                Cancellation Policy
                            </a>
                            . Users must follow the outlined process for any refund requests.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            4. Prohibited Activities
                        </h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>Posting false or misleading information.</li>
                            <li>Engaging in illegal or unauthorized activities.</li>
                            <li>
                                Violating the rights of others, including intellectual property
                                infringement.
                            </li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">
                            5. Limitation of Liability
                        </h3>
                        <p className="text-gray-700">
                            ContCave is not responsible for any damages, losses, or disputes
                            arising from bookings. Users and space providers assume full
                            responsibility for their interactions.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            6. Changes to Terms
                        </h3>
                        <p className="text-gray-700">
                            We reserve the right to modify these terms at any time. Continued
                            use of our platform implies acceptance of the updated terms.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">
                            7. Contact Us
                        </h3>
                        <p className="text-gray-700">
                            For any questions, reach out to us at{" "}
                            <strong>info@contcave.com</strong>.
                        </p>
                    </div>
                </div>
            </Container>
        </main>
    );
};

export default TermsAndConditions;
