import getCurrentUser from "@/app/actions/getCurrentUser";
import DashboardSidebarWrapper from "@/components/DashboardSidebarWrapper";
import { isOwner } from "@/lib/user/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <DashboardSidebarWrapper isOwner={isOwner(currentUser?.role)}>
        {children}
      </DashboardSidebarWrapper>
    </div>
  );
}
