"use client";
import Link from "next/link";
import React from "react";

import TransactionHistory from "@/components/profile/ManagePayments/TransactionHistory";
import { Transaction } from "@/types/transaction";
import { SafeUser } from "@/types/user";

interface TransactionClientProps {
  currentUser: SafeUser | null;
  transactions?: Transaction[];
}

const TransactionClient: React.FC<TransactionClientProps> = ({ currentUser, transactions = [] }) => {
  return (
    <div className="flex flex-col w-full gap-8">
      {currentUser?.is_owner && (
        <div className="flex justify-end">
          <Link
            href="/dashboard/payments"
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
  );
};

export default TransactionClient;
