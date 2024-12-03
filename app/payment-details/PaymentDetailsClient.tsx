"use client";

import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";
import { useRouter } from "next/navigation";

type Props = {};

const PaymentDetailsClient = ({ profile }) => {
  const router = useRouter();
  return (

    <div className="flex py-10">
      <div className="w-14 sticky top-50 flex flex-col items-center justify-center h-max p-4 rounded-full space-y-10 bg-[#12121291] backdrop-blur-xl ms-3">
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/Profile")}>
          <Image src="assets/user-white.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/payment-details")}>
          <Image src="assets/faCreditCard-black.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile-share")}>
          <Image src="assets/faUserPlus.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile-settings")}>
          <Image src="assets/faSettings.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
      </div>
      <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6 ">
        <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap gap-2">
          <h2 className="xl:text-center lg:text-center md:text-center text-left xl:text-2xl lg:text-2xl md:text-2xl text-lg text-slate-700 font-medium p-4 cursor-pointer" onClick={() => router.push("/profile-transaction")}>Transaction History</h2>
          <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl font-bold xl:px-8 lg:px-8 md:px-0 px-0 shadow-solid-6 p-4 rounded-t-xl">Payment Details</h2>
        </div>

        <div className="shadow-solid-6 p-10 rounded-xl">
          <p className="text-base mt-5 ">To  receive payments, please provide the following information</p>

          <form action="" className="xl:space-y-8 lg:space-y-8 md:space-y-8 space-y-3 mt-8">
            {/* Bank Info Title & Buttons */}
            <div className="flex justify-between">
              <div className="text-lg font-bold">Bank Account Information</div>
              {/* Buttons */}
              <div className="flex h-fit gap-15">
                <button type="button"
                  className="bg-black flex items-center justify-center text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center hover:opacity-90">
                  Modify
                </button>
                <button type="button"
                  className="bg-black flex items-center justify-center text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center hover:opacity-90">
                  Save
                </button>
              </div>
            </div>
            {/* Bank Info */}
            <div className="relative space-y-3 mt-3 shadow-solid-6 p-6 rounded-xl">
              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">Account Holder Name</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="ADAM LEWIS"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">Bank Name</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="HDFC"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">Account Number</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="XXXX-XXXX-XXXX"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">Re-enter Account Number</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="XXXX-XXXX-XXXX"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">IFSC Code (India)</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="HDFC12345678"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>
            {/* Tax Info */}
            <div className="text-lg font-bold mt-3">Tax Information</div>
            <div className="relative space-y-3 shadow-solid-6 p-6 rounded-xl">
              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">Tax Identification Number (TIN)</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="XYZXYX"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>

              <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                <div className="text-base w-[300px] xl:mb-0 lg:mb-0 md:mb-0 mb-2 font-bold text-slate-950">Tax Residency Information</div>
                <div className="flex xl:w-[calc(100%-300px)] lg:w-[calc(100%-300px)] md:w-[calc(100%-300px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-full">
                  <input type="text" name="name" id="name" value="XYZXYX"
                    className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                  <div className="w-4 h-4">
                    <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>

  );
};

export default PaymentDetailsClient;
