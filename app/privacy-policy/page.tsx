import type { Metadata } from "next";
import Image from "next/image";

import Container from "@/components/Container";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Learn how ContCave collects, uses, and protects personal data in line with Indian IT Act and SPDI Rules." as const;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: {
    canonical: "/privacy-policy",
  },
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
    noimageindex: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: true,
    },
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>

      <div className="relative h-64 w-full">
        <Image
          src="/assets/footer-banner.jpg"
          alt="Banner Image"
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
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 space-y-6">

            <p className="text-gray-700">
              This Privacy Policy applies to <strong>ContCave</strong>, a platform
              operated by <strong>Arkanet Ventures LLP</strong> (“ContCave”, “we”,
              “our”, or “us”). It explains how we collect, use, and protect your
              personal information when you access or use our services.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">1. Information We Collect</h3>
            <p className="text-gray-700">
              We collect only the information necessary to operate our platform and provide services:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>
                <strong>For all users:</strong> name, email address, phone number, and profile
                photo (if uploaded or linked via Google account).
              </li>
              <li>
                <strong>For studio owners:</strong> Aadhaar details <em>for verification only</em> (we do not store
                Aadhaar numbers); property registration documents for studio verification; bank account
                details for payouts; calendar access if you grant permission to sync availability.
              </li>
              <li>
                <strong>Studio listings:</strong> images, descriptions, pricing, amenities, and related details
                provided by the studio owner.
              </li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800">2. Responsibility for Studio Content</h3>
            <p className="text-gray-700">
              Studio owners are solely responsible for the accuracy and updates of their listings
              (including images and details). ContCave does not own submitted images; however, by
              uploading them, studio owners grant ContCave a non-exclusive right to use such images
              to promote listings on our website, social channels (e.g., Instagram), and marketing
              material.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">3. How We Use Your Information</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Verify studio ownership and authenticity.</li>
              <li>Enable listings, bookings, calendars, and user–studio communications.</li>
              <li>Process payments and transfer payouts to studio owners.</li>
              <li>Provide customer support and respond to inquiries.</li>
              <li>Improve our platform and services.</li>
              <li>Share studio listings and images for promotional purposes.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800">4. Data Sharing & Disclosure</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>We do <strong>not</strong> sell, rent, or trade personal information.</li>
              <li>
                We share limited data with trusted service providers (e.g., hosting, payment
                processors, identity verification partners) strictly to operate our services.
              </li>
              <li>We may disclose information if required by law or a valid legal process.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800">5. Data Retention</h3>
            <p className="text-gray-700">
              We retain personal data only as long as necessary to provide services, comply with legal
              obligations, or resolve disputes. Verification data (e.g., Aadhaar, property documents)
              is not stored beyond the verification process.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">6. Data Security</h3>
            <p className="text-gray-700">
              We implement reasonable technical and organizational measures to protect your data
              (aligned with the Indian IT Act and SPDI Rules). No online service can guarantee
              absolute security.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">7. Your Rights & Choices</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Access, update, or request deletion of your account information.</li>
              <li>Withdraw consent for optional features (e.g., calendar sync) at any time.</li>
              <li>Opt out of promotional communications via the unsubscribe link or by contacting us.</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800">8. Cookies & Analytics</h3>
            <p className="text-gray-700">
              We may use cookies and analytics tools (e.g., Google Analytics) to understand usage
              patterns and improve our services. You can manage cookies through your browser settings.
              Essential cookies are necessary for core functionality.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">9. Third-Party Links</h3>
            <p className="text-gray-700">
              Our platform may include links to third-party websites or services. Their privacy
              practices are independent of ours; please review their policies before use.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">10. Changes to This Policy</h3>
            <p className="text-gray-700">
              We may update this Policy from time to time. The updated version will be indicated by
              a new “Effective Date.” Continued use of the Services constitutes acceptance of the
              updated Policy.
            </p>

            <h3 className="text-xl font-semibold text-gray-800">11. Contact & Grievance Redressal (India)</h3>
            <p className="text-gray-700">
              For questions, complaints, or rights requests, contact:
            </p>
            <ul className="list-none pl-0 space-y-1 text-gray-700">
              <li><strong>Entity:</strong> Arkanet Ventures LLP (operating “ContCave”)</li>
              <li><strong>Email:</strong> info@contcave.com</li>


              <li className="text-sm text-gray-500">
                We aim to respond within <strong>30 days</strong> as per applicable Indian rules.
              </li>
            </ul>

            <p className="text-sm text-gray-500">
              <strong>Effective Date:</strong> 20 August 2025
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
