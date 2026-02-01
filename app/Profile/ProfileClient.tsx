"use client";

import { usePathname,useRouter, useSearchParams } from "next/navigation";
import { useCallback,useEffect, useState } from "react";

import ManagePayments from "@/components/Profile/ManagePayments/ManagePayments";
import MyProfile from "@/components/Profile/MyProfile";
import Settings from "@/components/Profile/ProfileSettings";
import ShareAndRefer from "@/components/Profile/ShareAndRefer";
import Sidebar from "@/components/Sidebar";
import { PaymentProfile } from "@/types/payment";
import { SafeUser } from "@/types/user";

const ProfileClient = ({ profile }: { profile: SafeUser | null }) => {
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
  const [paymentDetails, setPaymentDetails] = useState<PaymentProfile | null>(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentDataLoaded, setPaymentDataLoaded] = useState(false);
  const [paymentDataLoading, setPaymentDataLoading] = useState(false);

  const apiCall = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || `HTTP error! status: ${response.status}`;
      const error = new Error(errorMessage);
      (error as { status?: number }).status = response.status;
      throw error;
    }

    return response.json();
  }, []);

  const loadPaymentDetails = useCallback(async () => {
    if (!profile?.id) return null;

    try {
      const data = await apiCall(`/api/payment-details/${profile.id}`);
      return data.success ? (data.data || null) : null;
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('not found')) {
        return null;
      }
      console.error('Error fetching payment details:', error);
      return null;
    }
  }, [profile?.id, apiCall]);

  const loadTransactions = useCallback(async () => {
    if (!profile?.id) return [];

    try {
      const data = await apiCall(`/api/transactions/${profile.id}`);
      return data.success ? (data.transactions || []) : [];
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('not found')) {
        return [];
      }
      console.error('Error fetching transactions:', error);
      return [];
    }
  }, [profile?.id, apiCall]);

  const updatePaymentDetails = useCallback((newPaymentDetails: PaymentProfile) => {
    setPaymentDetails(newPaymentDetails);
  }, []);


  useEffect(() => {
    const loadPaymentData = async () => {
      if (!profile?.id || paymentDataLoaded) return;

      setPaymentDataLoading(true);
      try {
        const [paymentDetailsData, transactionsData] = await Promise.all([
          loadPaymentDetails(),
          loadTransactions()
        ]);

        setPaymentDetails(paymentDetailsData);
        setTransactions(transactionsData);
        setPaymentDataLoaded(true);
      } catch (error) {
        console.error('Error loading payment data:', error);
        setPaymentDetails(null);
        setTransactions([]);
        setPaymentDataLoaded(true);
      } finally {
        setPaymentDataLoading(false);
      }
    };

    loadPaymentData();
  }, [profile?.id, paymentDataLoaded, loadPaymentDetails, loadTransactions]);

  const renderSelectedComponent = () => {
    switch (selectedMenu) {
      case "Profile":
        return <MyProfile profile={profile} />;
      case "Manage Payments":
        return (
          <ManagePayments
            profile={profile}
            paymentDetails={paymentDetails}
            transactions={transactions}
            paymentDataLoaded={paymentDataLoaded}
            paymentDataLoading={paymentDataLoading}
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
      />

      
      <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">
        {renderSelectedComponent()}
      </div>
    </div>
  );
};

export default ProfileClient;