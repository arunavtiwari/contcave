import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import { FaShieldAlt, FaWhatsapp } from "react-icons/fa";
import { FiTag, FiZap } from "react-icons/fi";

import FAQ from "@/components/landing/FAQ";
import Container from "@/components/layout/Container";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import SectionHeader from "@/components/ui/SectionHeader";
import WhatsAppLinkButton from "@/components/ui/WhatsAppLinkButton";
import { GST_PERCENT } from "@/constants/gst";
import type { PlacePage } from "@/lib/listing/placePage";
import { buildWhatsAppUrl, GENERAL_ENQUIRY_MESSAGE } from "@/lib/whatsapp/urls";

type Reason = { icon: IconType; title: string; text: string; action?: ReactNode };

const VERIFIED_REASON: Reason = {
  icon: FaShieldAlt,
  title: "Owner-verified spaces",
  text: "Verified listings are confirmed by their owners and approved by the ContCave team before they go live.",
};

const PRICING_REASON: Reason = {
  icon: FiTag,
  title: "Upfront pricing",
  text: `Hourly rates are listed upfront, and checkout shows the ${GST_PERCENT}% GST before you pay.`,
};

function ReasonCard({ icon: Icon, title, text, action }: Reason) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-6">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-muted">
        <Icon size={18} className="text-foreground" />
      </div>
      <Heading as="h3" variant="h6" title={title} />
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      {action && <div className="mt-auto pt-5">{action}</div>}
    </div>
  );
}

export default function PlaceGuide({ page }: { page: PlacePage }) {
  const { copy, links, faqs } = page;

  return (
    <>
      <section className="py-section bg-muted/30">
        <Container>
          <SectionHeader
            badge="Why ContCave"
            title={<>Why book {copy.noun} <span className="text-muted-foreground italic">on ContCave</span></>}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReasonCard {...VERIFIED_REASON} />
            <ReasonCard icon={FiZap} title="Book in minutes" text={copy.instantNote} />
            <ReasonCard {...PRICING_REASON} />
            <ReasonCard
              icon={FaWhatsapp}
              title="Help on WhatsApp"
              text="Message the ContCave team to shortlist studios or plan your shoot."
              action={<WhatsAppLinkButton href={buildWhatsAppUrl(GENERAL_ENQUIRY_MESSAGE)} label="Message us" />}
            />
          </div>
        </Container>
      </section>

      {links.length > 0 && (
        <section className="py-section">
          <Container>
            <SectionHeader badge="Explore" title={<>Keep <span className="text-muted-foreground italic">exploring</span></>} />
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {links.map((group) => (
                <div key={group.title}>
                  <Heading as="h3" variant="h6" title={group.title} className="mb-4" />
                  <div className="flex flex-wrap gap-2">
                    {group.links.map((link) => (
                      <Button key={link.href} label={link.label} href={link.href} variant="outline" rounded fit />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <FAQ
        items={faqs}
        title={<>Questions about {copy.noun} <span className="text-muted-foreground italic">{copy.heading.place}</span></>}
        description="Answered from the live listings on ContCave and refreshed every hour."
      />
    </>
  );
}
