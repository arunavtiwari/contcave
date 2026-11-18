import ConciergeWidget from "@/components/concierge/ConciergeWidget";
import PublicPageShell from "@/components/layout/PublicPageShell";
import WhatsAppFloatingButton from "@/components/layout/WhatsAppFloatingButton";
import ScrollToTop from "@/components/ui/ScrollToTop";
import { conciergeEnabled } from "@/lib/concierge/config";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PublicPageShell>{children}</PublicPageShell>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {conciergeEnabled() && <ConciergeWidget />}
        <WhatsAppFloatingButton />
        <ScrollToTop />
      </div>
    </>
  );
}
