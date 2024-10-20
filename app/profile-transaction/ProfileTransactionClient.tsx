"use client";

import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";
import { useRouter } from "next/navigation";

type Props = {};

const ProfileTransactionClient =  ({profile}) => {
const router = useRouter();
  return (
  
        <div className="flex py-10">
      <div className="w-14 flex flex-col items-center justify-center h-max p-4 rounded-full space-y-10 bg-[#12121291] backdrop-blur-xl ms-3">
          <div className="flex items-center justify-center"  onClick={() => router.push("/Profile")}>
            <Image src="/assets/user.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
          <div className="flex items-center justify-center"  onClick={() => router.push("/payment-details")}>
            <Image src="/assets/faCreditCard.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
          <div className="flex items-center justify-center" onClick={() => router.push("/profile-share")}>
            <Image src="/assets/faUserPlus.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
          <div className="flex items-center justify-center" onClick={() => router.push("/profile-settings")}>
            <Image src="/assets/faSettings.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
        </div>
          <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6">
            <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap xl:divide-x-2 lg:divide-x-2 md:divide-x-0 divide-slate-500">
              <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl text-[#5D15B9] font-bold pr-8">Transaction History</h2>
              <h2 className="xl:text-center lg:text-center md:text-center text-left xl:text-2xl lg:text-2xl md:text-2xl text-lg text-slate-700 font-medium xl:px-8 lg:px-8 md:px-0 px-0">Payment Details</h2>
            </div>
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

  );
};

export default ProfileTransactionClient;
