"use client";
import Link from "next/link";
import React, { useState } from "react";

import TransactionHistory from "@/components/profile/ManagePayments/TransactionHistory";
import Sidebar from "@/components/Sidebar";
import { Transaction } from "@/types/transaction";
import { SafeUser } from "@/types/user";

interface ProfileTransactionClientProps {
  currentUser: SafeUser | null;
  transactions?: Transaction[];
}

const ProfileTransactionClient: React.FC<ProfileTransactionClientProps> = ({ currentUser, transactions = [] }) => {

  const [selectedMenu, setSelectedMenu] = useState("Manage Payments");
  return (
    <div className="flex min-h-screen">

      <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} menuType="profile" isOwner={currentUser?.is_owner} />

      <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">
        {currentUser?.is_owner && (
          <div className="flex justify-end">
            <Link
              href="/profile?tab=manage-payments"
              className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-neutral-100"
            >
              Go to Payment Details
            </Link>
          </div>
        )}
        <div>
          <TransactionHistory transactions={transactions} />
        </div>
      </div>
    </div>
  );
};

export default ProfileTransactionClient;
