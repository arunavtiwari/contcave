import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";
import { useRouter } from "next/navigation";

type Props = {};

const ProfileSettings = async (props: Props) => {
  const currentUser = await getCurrentUser();

  return (
    <ClientOnly>
      <Container>
        <div className="flex py-10">
        <div className="xl:w-20 lg:w-20 md:w-20 w-16 flex flex-col items-center justify-center h-max bg-[#B0AFAF] p-4 rounded-xl space-y-4">
          <div className="w-[30px] h-10 flex items-center justify-center"  >
            <Image src="/assets/user.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="w-[30px] h-10 flex items-center justify-center"  >
            <Image src="/assets/faCreditCard.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="w-[30px] h-10 flex items-center justify-center" >
            <Image src="/assets/faUserPlus.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
          </div>
          <div className="w-[30px] h-10 flex items-center justify-center" >
            <Image src="/assets/faSettings.svg" width={30} height={40} alt="" className="w-full h-full object-contain" />
          </div>
        </div>
          <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6">
            <h2 className="xl:text-center lg:text-center md:text-center text-left text-2xl text-slate-950 font-bold mb-10">Settings</h2>
            <div className="mt-8">
              <ul className="list-decimal space-y-3">
                <li>
                  <div className="text-lg font-bold text-slate-950">Support</div>
                  <ul className="list-disc pl-4">
                    <li>Access help resources, FAQs, or contact customer support.</li>
                    <li>[Help Center]</li>
                    <li>[Contact Support]</li>
                  </ul>
                </li>
                <li>
                  <div className="text-lg font-bold text-slate-950">Legal & Compliance</div>
                  <ul className="list-disc pl-4">
                    <li>Links to terms of service, privacy policy, and other legal documents</li>
                    <li>[Terms of Service]</li>
                    <li>[Privacy Policy]</li>
                  </ul>
                </li>
                <li>
                  <div className="text-lg font-bold text-slate-950">Feedback & Surveys</div>
                  <ul className="list-disc pl-4">
                    <li>Provide feedback or participate in surveys to improve the platform.</li>
                    <li>[Submit Feedback]</li>
                    <li>[Take Survey]</li>
                  </ul>
                </li>
              </ul>
              <div className="mt-44">
                <div className="text-red-700 text-lg font-bold">Delete Account</div>
                <p className="text-slate-600 font-medium text-sm"><span className="italic">Warning:</span> Deleting your account will permanently remove all your data and cannot be undone. </p>
                <button type="button" className="mt-4 w-max px-14 shadow-sm shadow-red-600 py-1 font-bold text-center text-red-700 border border-red-700 rounded-lg">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </ClientOnly>
  );
};

export default ProfileSettings;
