import getCurrentUser from "@/app/actions/getCurrentUser";
import Sidebar from "@/components/Sidebar";
import { isOwner } from "@/lib/user/permissions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <div className="min-h-screen bg-background flex flex-col pt-20">
      <div className="flex-1 w-full max-w-360 mx-auto flex px-4 sm:px-8">
        <Sidebar
          menuType="profile"
          isOwner={isOwner(currentUser?.role)}
        />
        <div className="flex flex-col flex-1 sm:pl-6 sm:pb-6 sm:pt-8 w-full gap-8 sm:border-l border-border overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
