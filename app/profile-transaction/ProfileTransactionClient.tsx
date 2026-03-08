"use client";
import Link from "next/link";
import React, { useState } from "react";

import Sidebar from "@/components/Sidebar";
import Heading from "@/components/ui/Heading";
import { Transaction } from "@/types/transaction";
import { SafeUser } from "@/types/user";

interface ProfileTransactionClientProps {
  currentUser: SafeUser | null;
  transactions?: Transaction[];
}

const ProfileTransactionClient: React.FC<ProfileTransactionClientProps> = ({ currentUser, transactions = [] }) => {

  const [selectedMenu, setSelectedMenu] = useState("Manage Payments");
  return (

    <div className="flex">

      <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} menuType="profile" isOwner={currentUser?.is_owner} />

      <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">
        <Heading title="Transactions"></Heading>
        <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap gap-2">
          <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl font-bold p-4 cursor-pointer shadow-solid-6 rounded-t-xl">Transaction History</h2>
          {currentUser?.is_owner && (
            <Link href="/Profile?tab=manage-payments" className="xl:text-center lg:text-center md:text-center text-left xl:text-2xl lg:text-2xl md:text-2xl text-lg text-slate-700 font-medium xl:px-8 lg:px-8 md:px-0 px-0 p-4 cursor-pointer">Payment Details</Link>
          )}
        </div>
        <div className="shadow-solid-6 p-6 rounded-b-xl rounded-tr-xl">
          <div className="space-y-6 mt-10">
            {transactions.length === 0 ? (
              <div className="text-center text-gray-500 py-10">No transactions found.</div>
            ) : (
              transactions.map((transaction, index) => (
                <div key={index} className="relative flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-center justify-between border border-slate-300 p-6 rounded-xl">
                  <div className="xl:w-2/3 lg:w-2/3 md:w-full w-full">
                    <div className="text-base font-normal">{transaction.businessName}</div>
                    <div className="text-base font-semibold">
                      <span>{new Date(transaction.date).toLocaleDateString()} </span>|
                      <span> {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="xl:w-1/3 lg:w-1/3 md:w-full w-full">
                    <div className="grid justify-end xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-3 grid-cols-1">
                      <div className="relative xl:text-center lg:text-center md:text-left text-left">
                        <div className="text-sm font-semibold">Guest</div>
                        <div className="text-base font-semibold text-slate-900">{transaction.guestName || "N/A"}</div>
                      </div>
                      <div className="relative xl:text-center lg:text-center md:text-left text-left">
                        <div className="text-sm font-semibold">Amount</div>
                        <div className="text-base font-semibold text-slate-900">₹ {transaction.amount}</div>
                      </div>
                      <div className="relative xl:text-center lg:text-center md:text-left text-left">
                        <div className="text-sm font-semibold">Status</div>
                        <div className={`text-base font-medium ${transaction.status === 'Successful' || transaction.status === 'Success' ? 'text-green-600' :
                          transaction.status === 'Failed' || transaction.status === 'Failure' ? 'text-red-600' :
                            'text-amber-600'
                          }`}>{transaction.status}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

  );
};

export default ProfileTransactionClient;
