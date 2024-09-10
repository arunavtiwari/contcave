"use client";

import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";
import { useRouter } from "next/navigation";

type Props = {};

const PaymentDetailsClient = ({profile}) => {
  const router = useRouter();
  return (
 
        <div className="flex py-10">
          <div className="xl:w-20 lg:w-20 md:w-20 w-16 flex flex-col items-center justify-center h-max bg-[#B0AFAF] p-4 rounded-xl space-y-4">
            <div className="w-[30px] h-10 flex items-center justify-center" onClick={() => router.push("/Profile")}>
              <Image src="assets/user-white.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
            <div className="w-[30px] h-10 flex items-center justify-center" onClick={() => router.push("/payment-details")}>
              <Image src="assets/faCreditCard-black.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
            <div className="w-[30px] h-10 flex items-center justify-center" onClick={() => router.push("/profile-share")}>
              <Image src="assets/faUserPlus.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
            <div className="w-[30px] h-10 flex items-center justify-center" onClick={() => router.push("/profile-settings")}>
              <Image src="assets/faSettings.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6">
            <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap xl:divide-x-2 lg:divide-x-2 md:divide-x-0 divide-slate-500">
              <h2 className="xl:text-center lg:text-center md:text-center text-left xl:text-2xl lg:text-2xl md:text-2xl text-lg text-slate-700 font-medium xl:pr-8 lg:pr-8 md:pr-8 pr-2">Transaction History</h2>
              <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl text-[#5D15B9] font-bold xl:px-8 lg:px-8 md:px-0 px-0">Payment Details</h2>
            </div>
            <p className="text-base mt-4">To  receive payments, please provide the following information</p>
            <form action="" className="xl:space-y-6 lg:space-y-6 md:space-y-6 space-y-3 mt-10">
              <div className="relative">
                <div className="text-lg font-bold mb-8">Bank Account Information</div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">Account Holder Name</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="ADAM LEWIS"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg"  width={4} height={4} alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">Bank Name</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="HDFC"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg"  width={4} height={4} alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">Account Number</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="XXXX-XXXX-XXXX"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">Re-enter Account Number</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="XXXX-XXXX-XXXX"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">IFSC Code (India)</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="HDFC12345678"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg"  width={4} height={4} alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="text-lg font-bold mb-8">Tax Information</div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">Tax Identification Number (TIN)</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="XYZXYX"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg" width={4} height={4} alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
                <div className="flex xl:mb-6 lg:mb-6 md:mb-6 mb-4 items-center xl:flex-nowrap lg:flex-nowrap md:flex-nowrap flex-wrap">
                  <div className="text-base font-semibold w-[250px] xl:mb-0 lg:mb-0 md:mb-0 mb-2">Tax Residency Information</div>
                  <div className="flex xl:w-[calc(100%-250px)] lg:w-[calc(100%-250px)] md:w-[calc(100%-250px)] w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                    <input type="text" name="name" id="name" value="XYZXYX"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                    <div className="w-4 h-4">
                      <Image src="assets/edit.svg" width={4} height={4}  alt="" className="w-full h-full object-contain" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex xl:flex-nowrap xl:w-[60%] lg:w-[60%] md:w-[60%] w-full ml-auto xl:justify-end lg:justify-end md:justify-end justify-center space-x-3 items-end lg:flex-nowrap md:flex-wrap flex-nowrap">
                <button type="button"
                  className="bg-[#5D15B9] h-[42px] xl:w-[60%] lg:w-[60%] md:w-[60%] w-[50%] flex items-center justify-center mx-auto mt-4 text-white px-6 font-bold shadow-lg rounded-md text-center">
                  <span className="xl:text-lg lg:text-sm md:text-sm text-base">Save</span>
                </button>
                <button type="button"
                  className="bg-[#ffffff] h-[42px] xl:w-[60%] lg:w-[60%] md:w-[60%] w-[50%] flex items-center justify-center mx-auto mt-4 border border-[#5D15B9] text-[#5D15B9] xl:px-6 lg:px-4 md:px-4 px-4 font-bold shadow-lg rounded-md text-center">
                  <span className="xl:text-lg lg:text-sm md:text-sm text-base">Modify</span>
                </button>
              </div>
            </form>
          </div>
        </div>
   
  );
};

export default PaymentDetailsClient;
