"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import ManagePayments from "@/components/profile/ManagePayments/ManagePayments";
import MyProfile from "@/components/profile/MyProfile";
import Settings from "@/components/profile/ProfileSettings";
import ShareAndRefer from "@/components/profile/ShareAndRefer";
import Sidebar from "@/components/Sidebar";
import { PaymentProfile } from "@/types/payment";
import { Transaction } from "@/types/transaction";
import { SafeUser } from "@/types/user";

const ProfileClient = ({
  profile,
  initialPaymentDetails,
  initialTransactions
}: {
  profile: SafeUser | null;
  initialPaymentDetails?: PaymentProfile | null;
  initialTransactions?: Transaction[];
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tabParam = searchParams?.get('tab');

  const getMenuFromParam = useCallback((param: string | null) => {
    switch (param) {
      case 'manage-payments': return 'Manage Payments';
      case 'share-refer': return 'Share & Refer';
      case 'settings': return 'Settings';
      default: return 'Profile';
    }
  }, []);

  const selectedMenu = getMenuFromParam(tabParam);

  const setSelectedMenu = useCallback((menu: string) => {
    let param = '';
    switch (menu) {
      case 'Manage Payments': param = 'manage-payments'; break;
      case 'Share & Refer': param = 'share-refer'; break;
      case 'Settings': param = 'settings'; break;
      default: param = 'profile';
    }
    router.push(`${pathname}?tab=${param}`);
  }, [pathname, router]);
  const [paymentDetails, setPaymentDetails] = useState<PaymentProfile | null>(initialPaymentDetails || null);
  const transactions = initialTransactions || [];

  const updatePaymentDetails = useCallback((newPaymentDetails: PaymentProfile) => {
    setPaymentDetails(newPaymentDetails);
  }, []);

  const renderSelectedComponent = () => {
    switch (selectedMenu) {
      case "Profile":
        return <MyProfile profile={profile} />;
      case "Manage Payments":
        if (profile && profile.is_owner === false) {
          return <MyProfile profile={profile} />;
        }
        return (
          <ManagePayments
            profile={profile}
            paymentDetails={paymentDetails}
            transactions={transactions}
            paymentDataLoading={false}
            onPaymentDetailsUpdate={updatePaymentDetails}
          />
        );
      case "Share & Refer":
        return <ShareAndRefer profile={profile} />;
      case "Settings":
        return <Settings profile={profile} />;
      default:
        return <MyProfile profile={profile} />;
    }
  };

  return (
    <div className="flex min-h-screen">

      <Sidebar
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
        menuType="profile"
        isOwner={profile?.is_owner}
      />


      <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-border">
        {renderSelectedComponent()}
      </div>
    </div>
  );
};

export default ProfileClient;
