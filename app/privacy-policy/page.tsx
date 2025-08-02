import Container from "@/components/Container";
import Image from "next/image";
import React from "react";

type Props = {};

const PrivacyPolicy = (props: Props) => {
    return (
        <>
            <div className="banner">
                <Image src="/assets/footer-banner.jpg" fill alt="Banner Image" />
                <div className="overlay">
                    <h1 className="banner-text">Privacy Policy</h1>
                </div>
            </div>

            <Container>
                <div className="pt-10">
                    <div className="container mx-auto mt-8 p-8 bg-white shadow-lg space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800">Privacy Policy</h2>
                        <p className="text-gray-700">
                            At ContCave, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">1. Information We Collect</h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>
                                <strong>Personal Information:</strong> Name, email, phone number, payment details, and other account-related data.
                            </li>
                            <li>
                                <strong>Usage Data:</strong> IP address, device details, and browsing activity on our platform.
                            </li>
                            <li>
                                <strong>Cookies & Tracking:</strong> We use cookies to enhance your experience and analyze usage trends.
                            </li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">2. How We Use Your Information</h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>To provide, improve, and personalize our services.</li>
                            <li>To process bookings, payments, and customer support requests.</li>
                            <li>To send service updates, promotional content, and relevant notifications.</li>
                            <li>To ensure security and prevent fraudulent activities.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">3. Data Sharing & Third Parties</h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>We do not sell or rent your data.</li>
                            <li>We may share information with service providers (e.g., payment processors) to facilitate transactions.</li>
                            <li>In compliance with legal requirements, we may disclose information to law enforcement authorities.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">4. Data Security</h3>
                        <p className="text-gray-700">
                            We implement industry-standard security measures to protect your data. However, no online platform can guarantee complete security.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">5. Your Rights & Choices</h3>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            <li>You can access, update, or delete your personal data via your account settings.</li>
                            <li>You can opt out of marketing emails at any time.</li>
                            <li>You can manage cookie preferences through your browser settings.</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-gray-800">6. Third-Party Links</h3>
                        <p className="text-gray-700">
                            Our platform may contain links to external websites. We are not responsible for their privacy practices or content.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">7. Changes to This Policy</h3>
                        <p className="text-gray-700">
                            We may update this Privacy Policy from time to time. Continued use of our services implies acceptance of any changes.
                        </p>

                        <h3 className="text-xl font-semibold text-gray-800">8. Contact Us</h3>
                        <p className="text-gray-700">
                            If you have any questions about this policy, reach out to us at <strong>info@contcave.com</strong>.
                        </p>
                    </div>
                </div>
            </Container>
        </>
    );
};

export default PrivacyPolicy;
