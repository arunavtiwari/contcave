import PublicPageShell from "@/components/layout/PublicPageShell";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicPageShell>{children}</PublicPageShell>;
}
