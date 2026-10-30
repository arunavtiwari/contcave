import Footer from "@/components/layout/Footer";

export default function PublicPageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-screen pt-20">{children}</div>
      <Footer />
    </>
  );
}
