"use client";

import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";
import { useRouter } from "next/navigation";

type Props = {};

const ProfileShareClient = ({ profile }) => {
  const router = useRouter();
  return (

    <div className="flex py-10">
      <div className="w-14 sticky top-50 flex flex-col items-center justify-center h-max p-4 rounded-full space-y-10 bg-[#12121291] backdrop-blur-xl ms-3">
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/Profile")}>
          <Image src="/assets/user-white.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/payment-details")}>
          <Image src="/assets/faCreditCard.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile-share")}>
          <Image src="/assets/faUserPlus-black.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
        <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile-settings")}>
          <Image src="/assets/faSettings.svg" width={25} height={25} alt="" className="object-contain" />
        </div>
      </div>
      <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6">
        <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl text-slate-950 font-bold">Share with Friends and Earn Rewards  🙌</h2>
        <p className="text-base text-slate-600 font-medium mb-8">Refer your friends to ContCave and both of you can earn
          rewards.</p>
        <div className="space-y-12">
          <div className="relative">
            <div className="text-base font-semibold text-slate-950">How It Works:</div>
            <ul className="mt-2 list-decimal pl-4">
              <li>Share your unique referral link or code with friends.</li>
              <li>When someone signs up and books their first space using your referral link or code, you both earn
                rewards!</li>
            </ul>
          </div>
          <div className="relative">
            <div className="text-base font-semibold text-slate-950">Your Referral Link:</div>
            <div className="flex items-center bg-gray-200 w-full px-3 py-2 mt-4">
              <div className="w-6 h-6">
                <Image src="assets/Invite.svg" alt="" width={30} height={40} className="w-full h-full object-contain" />
              </div>
              <div className="text-base pl-4">[Your Unique Referral Link]</div>
            </div>
          </div>
        </div>
        <div className="flex items-center xl:justify-end lg:justify-end md:justify-end justify-between xl:text-right lg:text-right md:text-right text-left mt-10 xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap">
          <div className="text-lg pr-4"> Copy and share it with your friends now!</div>
          <ul className="flex items-center space-x-2">
            <li className="w-8 h-8">
              <Image src="assets/Messages.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
            </li>
            <li className="w-8 h-8">
              <Image src="assets/Instagram.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
            </li>
            <li className="w-8 h-8">
              <Image src="assets/WhatsApp.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
            </li>
          </ul>
        </div>
        <hr className="h-px my-8 bg-gray-200 border-0 " />

        <div className="relative mt-8">
          <div className="text-xl font-bold text-slate-950">Promote and Earn 🎉</div>
          <p className="pt-4 text-base font-normal leading-tight">If you're an influencer or content creator with a following, you can promote ContCave while shooting at our properties and earn benefits/discounts.</p>
          <div className="space-y-8 mt-8">
            <div className="relative">
              <div className="text-lg font-semibold text-slate-950 mb-2">How It Works:</div>
              <ul className="list-decimal font-normal text-slate-800 pl-6">
                <li>Shoot content at one of our featured properties and tag us in your posts or videos.</li>
                <li>Share your content with your audience and mention your experience with us.</li>
                <li>Contact us with links to your posts or videos to claim your rewards!</li>
              </ul>
            </div>
            <div className="relative">
              <div className="text-lg font-semibold text-slate-950 mb-2">Benefits for Influencers:</div>
              <ul className="list-disc font-normal text-slate-800 pl-6">
                <li>Exclusive discounts on future bookings.</li>
                <li>Featured promotion on our platform and social media channels.</li>
                <li>Potential collaboration opportunities.</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex items-center xl:justify-end lg:justify-end md:justify-end justify-between xl:text-right lg:text-right md:text-right text-left mt-16  xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap">
          <div className="text-lg pr-4"> Follow and Tag Us Now!</div>
          <ul className="flex items-center space-x-2">
            <li className="w-8 h-8">
              <Image src="assets/Instagram.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
            </li>
          </ul>
        </div>
      </div>
    </div>

  );
};

export default ProfileShareClient;
