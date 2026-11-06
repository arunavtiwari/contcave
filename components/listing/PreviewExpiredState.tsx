import type { Metadata } from "next";

import Button from "@/components/ui/Button";
import PageState from "@/components/ui/PageState";
import { LISTING_PREVIEW_TTL_DAYS } from "@/lib/listing/preview";
import { buildWhatsAppUrl, previewLinkExpiredMessage } from "@/lib/whatsapp/urls";

export const PREVIEW_EXPIRED_METADATA: Metadata = {
  title: "Preview link expired",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function PreviewExpiredState({ studioName }: { studioName: string }) {
  return (
    <PageState
      eyebrow="Preview link expired"
      title="This preview link has expired"
      subtitle={`Preview links last ${LISTING_PREVIEW_TTL_DAYS} days. Ask ContCave for a new link to see ${studioName} before it goes live.`}
      actions={
        <>
          <Button label="Ask for a new link" href={buildWhatsAppUrl(previewLinkExpiredMessage(studioName))} target="_blank" size="md" rounded fit />
          <Button label="Browse all studios" href="/studios" variant="outline" size="md" rounded fit />
        </>
      }
    />
  );
}
