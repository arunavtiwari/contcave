import Footer from "@/components/layout/Footer";
import PageOffset from "@/components/layout/PageOffset";

export default function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageOffset>{children}</PageOffset>
      <Footer />
    </>
  );
}
