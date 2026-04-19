import type { Metadata } from "next";

import ContentLayout from "@/components/legal/ContentLayout";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";

const DESCRIPTION =
  "Learn how ContCave handles your personal information, data security, and privacy across our platform and services." as const;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: DESCRIPTION,
  alternates: { canonical: "/privacy-policy" },
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
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
};

const PrivacyPolicy = () => {
  return (
    <ContentLayout
      title="Privacy Policy"
      subtitle="Last updated: October 20, 2025"
    >
      <section>
        <p>
          This Privacy Policy applies to <strong>ContCave</strong>, a platform
          operated by <strong>ContCave Technologies Private Limited</strong>.
          We are committed to protecting your personal information and your
          right to privacy.
        </p>
      </section>

      <section>
        <h2>1. Information We Collect</h2>
        <p>
          We collect personal information that you voluntarily provide to us
          when you register on the platform, express an interest in obtaining
          information about us or our products and services, when you
          participate in activities on the platform, or otherwise when you
          contact us.
        </p>
      </section>

      <section>
        <h2>2. How We Use Your Information</h2>
        <p>
          We use personal information collected via our platform for a variety
          of business purposes:
        </p>
        <ul>
          <li>To facilitate account creation and logon process.</li>
          <li>To send administrative information to you.</li>
          <li>To fulfill and manage your bookings.</li>
          <li>To protect our platform and services.</li>
        </ul>
      </section>

      <section>
        <h2>3. Sharing Your Information</h2>
        <p>
          We only share information with your consent, to comply with laws, to
          provide you with services, to protect your rights, or to fulfill
          business obligations.
        </p>
      </section>

      <section>
        <h2>4. Cookie Policy</h2>
        <p>
          We may use cookies and similar tracking technologies to access or
          store information. Specific information about how we use such
          technologies and how you can refuse certain cookies is set out in
          our Cookie Policy.
        </p>
      </section>

      <section>
        <h2>5. Data Security</h2>
        <p>
          We aim to protect your personal information through a system of
          organizational and technical security measures. However, no
          electronic transmission over the internet or information storage
          technology can be guaranteed to be 100% secure.
        </p>
      </section>

      <section>
        <h2>6. Contact Us</h2>
        <p>
          If you have questions or comments about this policy, you may email
          us at:{" "}
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

export default PrivacyPolicy;
