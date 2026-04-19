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
        <main className="bg-background min-h-screen">
            <div className="relative h-64 w-full">
                <Image
                    src="/assets/banner.jpg"
                    alt="ContCave Terms and Conditions"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center">
                    <h1 className="text-background text-4xl font-bold uppercase tracking-accent">Terms & Conditions</h1>
                </div>
            </div>

            <section className="py-16">
                <Container>
                    <div className="bg-card rounded-2xl border border-border p-6 md:p-8 space-y-8 max-w-4xl mx-auto">
                        <p className="text-muted-foreground leading-relaxed">
                            Welcome to ContCave. By accessing or using our platform, you agree
                            to comply with these Terms & Conditions. Please read them
                            carefully.
                        </p>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground">
                                1. Use of Our Platform
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
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
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground">
                                2. Bookings & Payments
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
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
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground">
                                3. Cancellations & Refunds
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Cancellations and refunds are subject to our{" "}
                                <a href="/cancellation" className="text-foreground hover:underline font-medium">
                                    Cancellation Policy
                                </a>
                                . Users must follow the outlined process for any refund requests.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground">
                                4. Prohibited Activities
                            </h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li>Posting false or misleading information.</li>
                                <li>Engaging in illegal or unauthorized activities.</li>
                                <li>
                                    Violating the rights of others, including intellectual property
                                    infringement.
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground">
                                5. Limitation of Liability
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                ContCave is not responsible for any damages, losses, or disputes
                                arising from bookings. Users and space providers assume full
                                responsibility for their interactions.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-foreground">
                                6. Changes to Terms
                            </h3>
                            <p className="text-muted-foreground leading-relaxed">
                                We reserve the right to modify these terms at any time. Continued
                                use of our platform implies acceptance of the updated terms.
                            </p>
                        </div>

                        <div className="space-y-4 border-t border-border pt-8 mt-12">
                            <h3 className="text-xl font-bold text-foreground">
                                7. Contact Us
                            </h3>
                            <p className="text-muted-foreground">
                                For any questions, reach out to us at{" "}
                                <strong className="text-foreground">info@contcave.com</strong>.
                            </p>
                        </div>
                    </div>
                </Container>
            </section>
        </main>
    );
};

export default TermsAndConditions;
