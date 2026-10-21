import type { Metadata } from "next";
import type { IconType } from "react-icons";
import { FaShieldAlt } from "react-icons/fa";
import { IoInformationCircleOutline } from "react-icons/io5";

import getCurrentUser from "@/app/actions/getCurrentUser";
import GetVerifiedButton from "@/components/landing/GetVerifiedButton";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import PageBanner from "@/components/ui/PageBanner";
import Pill from "@/components/ui/Pill";
import { BRAND_NAME, OG_IMAGE, SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

const TITLE = "Verified vs Curated Studios";
const DESCRIPTION =
  "How Verified and Curated studios differ on ContCave: who confirms the details, how pricing works, and when you can book instantly or need to enquire." as const;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/verified-vs-curated" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/verified-vs-curated`,
    siteName: BRAND_NAME,
    type: "article",
    images: [{ url: `${SITE_URL}${OG_IMAGE}`, width: 1200, height: 630, alt: TITLE }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    site: "@ContCave",
    images: [`${SITE_URL}${OG_IMAGE}`],
  },
  robots: { index: true, follow: true },
};

type Tier = {
  key: "verified" | "curated";
  label: string;
  pillVariant: "verified-button" | "curated-button";
  icon: IconType;
  tone: string;
  title: string;
  summary: string;
  howYouBook: string;
};

const TIERS: Tier[] = [
  {
    key: "verified",
    label: "Verified",
    pillVariant: "verified-button",
    icon: FaShieldAlt,
    tone: "text-success bg-success/10",
    title: "Confirmed by the studio",
    summary: "The owner manages the listing and keeps pricing, photos and availability up to date.",
    howYouBook: "Book instantly",
  },
  {
    key: "curated",
    label: "Curated",
    pillVariant: "curated-button",
    icon: IoInformationCircleOutline,
    tone: "text-warning bg-warning/10",
    title: "Discovered by ContCave",
    summary: "Our team found the space and compiled its details from public sources, so you can discover more options.",
    howYouBook: "Enquire",
  },
];

const COMPARISON: Array<{ label: string; verified: string; curated: string }> = [
  { label: "Details confirmed by", verified: "The studio owner", curated: "ContCave, from public sources" },
  { label: "Pricing", verified: "Fixed hourly and package prices", curated: "Indicative range, or on enquiry" },
  { label: "Availability", verified: "Live calendar", curated: "Checked when you enquire" },
  { label: "How you book", verified: "Book and pay on ContCave", curated: "Enquire on WhatsApp; we confirm for you" },
  { label: "Kept up to date", verified: "By the owner", curated: "Until the owner claims it, details may change" },
];

export default async function VerifiedVsCuratedPage() {
  const currentUser = await getCurrentUser().catch(() => null);

  return (
    <main className="min-h-screen bg-background">
      <PageBanner
        title="Verified vs Curated"
        subtitle="Every studio on ContCave carries one of two labels. Here's what each means for your shoot."
      />

      <section className="relative z-20 -mt-10 pb-20">
        <Container>
          <div className="mx-auto flex max-w-5xl flex-col gap-10">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {TIERS.map((tier) => (
                <article
                  key={tier.key}
                  className={cn(
                    "flex flex-col gap-4 rounded-2xl border bg-background p-6 shadow-sm lg:p-8",
                    tier.key === "verified" ? "border-success/30" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", tier.tone)}>
                        <tier.icon size={18} aria-hidden="true" />
                      </span>
                      <Pill label={tier.label} variant={tier.pillVariant} size="sm" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">{tier.howYouBook}</span>
                  </div>
                  <Heading title={tier.title} variant="h4" subtitle={tier.summary} />
                </article>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm">
              <div className="border-b border-border px-6 py-4">
                <Heading title="Side by side" variant="h5" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">How Verified and Curated studios differ</caption>
                  <thead className="bg-muted/40">
                    <tr>
                      <th scope="col" className="px-6 py-3 font-medium text-muted-foreground"><span className="sr-only">Detail</span></th>
                      <th scope="col" className="px-6 py-3 font-semibold text-success">Verified</th>
                      <th scope="col" className="px-6 py-3 font-semibold text-warning">Curated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {COMPARISON.map((row) => (
                      <tr key={row.label}>
                        <th scope="row" className="px-6 py-4 font-medium text-foreground">{row.label}</th>
                        <td className="px-6 py-4 text-foreground/80">{row.verified}</td>
                        <td className="px-6 py-4 text-foreground/80">{row.curated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-muted/30 p-6">
                <Heading
                  title="Planning a shoot?"
                  variant="h5"
                  subtitle="Verified studios can be booked and paid for right away. For Curated ones, enquire and we'll confirm the details for you."
                />
                <Button label="Browse studios" href="/studios" rounded fit />
              </div>
              <div className="flex flex-col items-start gap-4 rounded-2xl border border-success/30 bg-success/5 p-6">
                <Heading
                  title="Own a studio listed as Curated?"
                  variant="h5"
                  subtitle="Claim it and get verified to manage your listing, take bookings and appear higher in search. It takes about 5 minutes."
                />
                <GetVerifiedButton isLoggedIn={Boolean(currentUser)} />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
