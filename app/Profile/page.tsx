import ClientOnly from "@/components/ClientOnly";
import Container from "@/components/Container";
import React from "react";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";

type Props = {};

const Profile = async (props: Props) => {
  const currentUser = await getCurrentUser();


  return (
    <ClientOnly>
      <Container>
        <div className="flex py-10">
          <div className="xl:w-20 lg:w-20 md:w-20 w-16 flex flex-col items-center justify-center h-max bg-[#B0AFAF] p-4 rounded-xl space-y-4">
            <div className="w-[30px] h-10 flex items-center justify-center">
                <Image src="assets/user.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
            <div className="w-[30px] h-10 flex items-center justify-center">
              <Image src="assets/faCreditCard.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
            <div className="w-[30px] h-10 flex items-center justify-center">
              <Image src="assets/faUserPlus.svg"  width={30} height={40} alt="" className="w-full h-full object-contain" />
            </div>
            <div className="w-[30px] h-10 flex items-center justify-center">
              <Image src="assets/faSettings.svg" width={30} height={40}  alt="" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6">
            <h2 className="xl:text-center lg:text-center md:text-center text-left xl:text-2xl text-xl text-slate-950 font-bold mb-10">User Profile</h2>
            <div className="xl:grid lg:grid xl:grid-cols-2 lg:grid-cols-2 md:flex gap-10">
              <div className="relative">
                <div className="bg-[#F0EAF9] p-6 rounded-xl xl:flex lg:flex md:flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-start">
                  <div className="relative">
                    <div
                      className="w-24 h-24 relative overflow-hidden rounded-full border-4 shadow-lg shadow-violet-400 border-white mx-auto z-[1]">
                      <div className="w-full h-full">
                        <Image src="assets/default-profile.svg" width={24} height={24}  alt="" className="w-full h-full object-contain" />
                      </div>
                      <div className="absolute bottom-0 flex mx-auto right-0 w-full h-6 overflow-hidden shadow bg-gray-500 ">
                        <input type="file" className="absolute top-0 right-0 w-full h-full z-10 opacity-0 cursor-pointer"
                          accept="image/png, image/gif, image/jpeg" />
                        <div className="w-full h-full text-xl text-gray-400 flex justify-center items-center">
                          <span className="text-white w-4 h-4  text-md">
                            <Image src="assets/faCamera.svg" alt="" className="w-full h-full object-contain" />
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm italic mt-10">Member since 2023</div>
                  </div>
                  <form action="" className="xl:w-[calc(100%-96px)] lg:w-[calc(100%-96px)] md:w-full w-full xl:pl-5 lg:pl-5 md:pl-0 md:pt-5 space-y-4">
                    <div className="flex w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-md">
                      <input type="text" name="name" id="name" value="Username"
                        className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0" />
                      <div className="w-4 h-4">
                        <Image src="assets/edit.svg" width={16} height={16} alt="" className="w-full h-full object-contain" />
                      </div>
                    </div>
                    <div className="flex w-full  bg-white border border-slate-400 items-end px-2 py-2 rounded-md">
                      <textarea name="" id=""
                        className="w-[calc(100%-16px)] h-60 resize-none border-0 text-sm bg-transparent focus:ring-0">Lorem ipsum dolor sit amet,consectetur adipiscing elit,sed do eiusmod tempor
                        incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris
                        nisi ut aliquip ex ea commodo. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</textarea>
                      <div className="w-4 h-4">
                        <Image src="assets/edit.svg"  width={16} height={16}  alt="" className="w-full h-full object-contain" />
                      </div>
                    </div>

                  </form>
                </div>
                <div className="relative space-y-3 mt-8">
                  <div className="flex border-b md:flex-wrap flex-wrap xl:justify-between lg:justify-between md:justify-between justify-between items-center border-b-slate-500 pb-3">
                    <div className="text-xl font-bold text-slate-950">Location</div>
                    <input type="text"
                      className="text-lg font-normal text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                      value="Delhi, DL" />
                  </div>
                  <div className="flex border-b md:flex-wrap flex-wrap xl:justify-between lg:justify-between md:justify-between justify-between items-center border-b-slate-500 pb-3">
                    <div className="text-xl font-bold text-slate-950">Languages</div>
                    <input type="text"
                      className="text-lg font-normal text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                      value="English, Hindi" />
                  </div>
                </div>
                <div className="relative mt-8">
                  <div className="text-2xl font-bold text-[#7D1087]">Private Details</div>
                  <div className="relative space-y-3 mt-3">
                    <div className="flex justify-between items-center ">
                      <div className="xl:text-xl lg:text-xl md:text-xl text-base font-bold text-slate-950">Title</div>
                      <input type="text"
                        className="text-lg font-normal text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                        value="Name" />
                    </div>
                    <div className="flex justify-between items-center ">
                      <div className="xl:text-xl lg:text-xl md:text-xl text-base font-bold text-slate-950">Email</div>
                      <input type="email"
                        className="text-lg font-normal text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                        value="abc@email.com" />
                    </div>
                    <div className="flex justify-between items-center ">
                      <div className="xl:text-xl lg:text-xl md:text-xl text-base font-bold text-slate-950">Phone</div>
                      <input type=""
                        className="text-lg font-normal text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                        value="+91-8888888888" />
                    </div>
                  </div>
                </div>

              </div>
              <div className="realtive xl:pt-8 lg:pt-8 md:pt-8 pt-24 space-y-20">
                <div className="border border-x-slate-300 p-6 rounded-2xl">
                  <div className="w-24 h-2w-24 flex justify-center mx-auto mt-[-65px]">
                    <Image src="assets/check.svg" alt="" className="w-full h-full" />
                  </div>
                  <div className="pt-4 text-center">
                    <div className="text-xl text-center font-bold text-slate-950">User Verification</div>
                    <p className="text-base leading-tight pt-3">
                      Get verified effortlessly. We prioritize genuine listings, which is why
                      hosts are required to verify their identity to list spaces and
                      add payment details to receive payments.
                    </p>
                    <button type="button"
                      className="bg-[#5D15B9] h-[44px] flex items-center justify-center mx-auto mt-4 text-white px-6 font-bold shadow-lg rounded-xl text-center">
                      <span className="xl:text-lg lg:text-sm md:text-sm text-base">Get Verified </span>
                      <div className="pl-10 h-[44px] flex items-center justify-center text-[20px]"></div>
                    </button>
                  </div>
                </div>
                <div className="border border-x-slate-300 p-6 rounded-2xl">
                  <div className="w-24 h-2w-24 flex justify-center mx-auto mt-[-65px]">
                    <Image src="assets/check.svg" alt="" className="w-full h-full" />
                  </div>
                  <div className="pt-4 text-center">
                    <div className="text-xl text-center font-bold text-slate-950">User Verified</div>
                    <p className="text-base leading-tight pt-3">
                      Your profile is verified, you can now
                      list your space and add payment details
                    </p>
                    <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap">
                      <button type="button"
                        className="bg-[#5D15B9] h-[44px] flex items-center justify-center mx-auto mt-4 text-white px-6 font-bold shadow-lg rounded-xl text-center">
                        <span className="xl:text-lg lg:text-sm md:text-sm text-base">List Your Space</span>
                      </button>
                      <button type="button"
                        className="bg-[#5D15B9] h-[44px] flex items-center justify-center mx-auto mt-4 text-white px-6 font-bold shadow-lg rounded-xl text-center">
                        <span className="xl:text-lg lg:text-sm md:text-sm text-base">Add Payment Details</span>
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </ClientOnly>
  );
};

export default Profile;
