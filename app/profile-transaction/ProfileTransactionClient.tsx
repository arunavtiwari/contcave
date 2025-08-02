"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Heading from "@/components/Heading";

type Props = {};

const ProfileTransactionClient = ({ profile }) => {
  const router = useRouter();
  const [selectedMenu, setSelectedMenu] = useState("Manage Payments");
  return (

    <div className="flex">
      {/* Sidebar */}
      <Sidebar selectedMenu={selectedMenu} setSelectedMenu={setSelectedMenu} menuType="profile" />

      <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">
        <Heading title="Transactions"></Heading>
        <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap gap-2">
          <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl font-bold p-4 cursor-pointer shadow-solid-6 rounded-t-xl">Transaction History</h2>
          <h2 className="xl:text-center lg:text-center md:text-center text-left xl:text-2xl lg:text-2xl md:text-2xl text-lg text-slate-700 font-medium xl:px-8 lg:px-8 md:px-0 px-0 p-4 cursor-pointer" onClick={() => router.push("/payment-details")}>Payment Details</h2>
        </div>
        <div className="shadow-solid-6 p-6 rounded-b-xl rounded-tr-xl">
          <div className="space-y-6 mt-10">
            <div className="relative flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-center justify-between border border-slate-300 p-6 rounded-xl">
              <div className="xl:w-2/3 lg:w-2/3 md:w-full w-full">
                <div className="text-base font-normal">Urban Oasis Studio</div>
                <div className="text-base font-semibold">
                  <span>22 January, 2024 </span>|
                  <span>10:04 AM</span>
                </div>
              </div>
              <div className="xl:w-1/3 lg:w-1/3 md:w-full w-full">
                <div className="grid justify-end xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-3 grid-cols-1">
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Guest</div>
                    <div className="text-base font-semibold text-slate-900">Mr. Kaleb</div>
                  </div>
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Amount</div>
                    <div className="text-base font-semibold text-slate-900">₹ 3400</div>
                  </div>
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Status</div>
                    <div className="text-base text-amber-600 font-medium">Pending</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-center justify-between border border-slate-300 p-6 rounded-xl">
              <div className="xl:w-2/3 lg:w-2/3 md:w-full w-full">
                <div className="text-base font-normal">Urban Oasis Studio</div>
                <div className="text-base font-semibold">
                  <span>22 January, 2024 </span>|
                  <span>10:04 AM</span>
                </div>
              </div>
              <div className="xl:w-1/3 lg:w-1/3 md:w-full w-full">
                <div className="grid justify-end xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-3 grid-cols-1">
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Guest</div>
                    <div className="text-base font-semibold text-slate-900">Mr. Kaleb</div>
                  </div>
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Amount</div>
                    <div className="text-base font-semibold text-slate-900">₹ 3400</div>
                  </div>
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Status</div>
                    <div className="text-base text-green-600 font-medium">Successful</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-center justify-between border border-slate-300 p-6 rounded-xl">
              <div className="xl:w-2/3 lg:w-2/3 md:w-full w-full">
                <div className="text-base font-normal">Urban Oasis Studio</div>
                <div className="text-base font-semibold">
                  <span>22 January, 2024 </span>|
                  <span>10:04 AM</span>
                </div>
              </div>
              <div className="xl:w-1/3 lg:w-1/3 md:w-full w-full">
                <div className="grid justify-end xl:grid-cols-3 lg:grid-cols-3 md:grid-cols-3 grid-cols-1">
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Guest</div>
                    <div className="text-base font-semibold text-slate-900">Mr. Kaleb</div>
                  </div>
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Amount</div>
                    <div className="text-base font-semibold text-slate-900">₹ 3400</div>
                  </div>
                  <div className="relative xl:text-center lg:text-center md:text-left text-left">
                    <div className="text-sm font-semibold">Status</div>
                    <div className="text-base text-red-600 font-medium">Failed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
};

export default ProfileTransactionClient;
