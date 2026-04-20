import type { Metadata } from "next";

import ContentLayout from "@/components/ui/ContentLayout";
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
        <ContentLayout
            title="Terms & Conditions"
            subtitle="Last updated: April 18, 2026"
        >
            <section>
                <p>
                    Welcome to <strong>ContCave</strong>. By accessing or using our
                    platform, you agree to comply with these Terms & Conditions. Please
                    read them carefully.
                </p>
            </section>

            <section>
                <h2>1. Use of Our Platform</h2>
                <ul>
                    <li>You must be at least 18 years old to use our services.</li>
                    <li>
                        Users are responsible for ensuring the accuracy of their account
                        and listing details.
                    </li>
                    <li>
                        Any misuse, fraudulent activity, or violation of laws will result
                        in account suspension or termination.
                    </li>
                </ul>
            </section>

            <section>
                <h2>2. Bookings & Payments</h2>
                <ul>
                    <li>All bookings are subject to availability and confirmation.</li>
                    <li>Payments must be made through our secure payment gateway.</li>
                    <li>Service fees, if applicable, are non-refundable.</li>
                </ul>
            </section>

            <section>
                <h2>3. Cancellations & Refunds</h2>
                <p>
                    Cancellations and refunds are subject to our{" "}
                    <a
                        href="/cancellation"
                        className="text-primary hover:underline font-medium transition-colors"
                    >
                        Cancellation Policy
                    </a>
                    . Users must follow the outlined process for any refund requests.
                </p>
            </section>

            <section>
                <h2>4. Prohibited Activities</h2>
                <ul>
                    <li>Posting false or misleading information.</li>
                    <li>Engaging in illegal or unauthorized activities.</li>
                    <li>
                        Violating the rights of others, including intellectual property
                        infringement.
                    </li>
                </ul>
            </section>

            <section>
                <h2>5. Limitation of Liability</h2>
                <p>
                    ContCave is not responsible for any damages, losses, or disputes
                    arising from bookings. Users and space providers assume full
                    responsibility for their interactions.
                </p>
            </section>

            <section>
                <h2>6. Contact Us</h2>
                <p>
                    For any questions regarding these terms, please contact us at:{" "}
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

export default TermsAndConditions;
