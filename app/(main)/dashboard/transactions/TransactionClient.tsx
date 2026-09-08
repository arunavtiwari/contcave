"use client";
import Link from "next/link";
import React from "react";

import TransactionHistory from "@/components/profile/ManagePayments/TransactionHistory";
import { isOwner } from "@/lib/user/permissions";
import { Transaction } from "@/types/transaction";
import { SafeUser } from "@/types/user";

interface TransactionClientProps {
  currentUser: SafeUser | null;
  transactions?: Transaction[];
  pagination?: { page: number; totalPages: number; total: number };
}

const TransactionClient: React.FC<TransactionClientProps> = ({ currentUser, transactions = [], pagination }) => {
  return (
    <div className="flex flex-col w-full gap-8">
      {currentUser && isOwner(currentUser.role) && (
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
      {pagination && pagination.totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4" aria-label="Transaction pages">
          <span className="text-sm text-muted-foreground">{pagination.total} transactions</span>
          <div className="flex items-center gap-2">
            {pagination.page > 1 && (
              <Link className="rounded-full border px-4 py-2 text-sm" href={`/dashboard/transactions?page=${pagination.page - 1}`}>
                Previous
              </Link>
            )}
            <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
            {pagination.page < pagination.totalPages && (
              <Link className="rounded-full border px-4 py-2 text-sm" href={`/dashboard/transactions?page=${pagination.page + 1}`}>
                Next
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
};

export default TransactionClient;
