"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Image from "next/image";
import getCurrentUser from "../actions/getCurrentUser";
import ImageUpload from "@/components/inputs/ImageUpload";
import useRentModal from "@/hook/useRentModal";
import useLoginModel from "@/hook/useLoginModal";
import { useRouter } from "next/navigation";

type Props = {};

const ProfileClient = ({ profile }) => {
  const router = useRouter();
  const rentModel = useRentModal();
  const loginModel = useLoginModel();
  const [currentUser, setCurrentUser] = useState<any>();
  const [editMode, setEditMode] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    description: "",
    location: "",
    language: "",
    title: "",
    email: "",
    phone: "",
    profileImage: ""
  });
  const onRent = useCallback(() => {


    rentModel.onOpen();
  }, [currentUser, loginModel, rentModel]);
  useEffect(() => {
    const fetchUser = async () => {
      const user: any = profile;
      if (user) {
        setCurrentUser(user);
        setUserData({
          name: user.name || "",
          description: user.description || "",
          location: user.location || "",
          language: user.language || "",
          title: user.title || "",
          email: user.email || "",
          phone: user.phone || "",
          profileImage: user.profileImage || user.image || "/assets/default-profile.svg"
        });
      }
    };



    fetchUser();
  }, []);

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await axios.put("/api/user", userData);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update user data", error);
    }
  };

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex py-10">
        {/* Menu */}
        <div className="w-14 sticky top-50 flex flex-col items-center justify-center h-max bg-[#12121291] backdrop-blur-xl ms-3 p-4 rounded-full space-y-10">
          <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/Profile")}>
            <Image src="/assets/user.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
          <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/payment-details")}>
            <Image src="/assets/faCreditCard.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
          <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile-share")}>
            <Image src="/assets/faUserPlus.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
          <div className="flex items-center justify-center cursor-pointer" onClick={() => router.push("/profile-settings")}>
            <Image src="/assets/faSettings.svg" width={25} height={25} alt="" className="object-contain" />
          </div>
        </div>

        <div className="xl:w-[calc(100%-80px)] lg:w-[calc(100%-80px)] md:w-[calc(100%-80px)] w-[calc(100%-64px)] xl:px-10 lg:px-10 md:px-6 px-6">
          <h2 className="xl:text-center lg:text-center md:text-center text-left xl:text-3xl text-xl text-slate-950 font-bold mb-10">User Profile</h2>
          <div className="xl:grid lg:grid xl:grid-cols-2 lg:grid-cols-2 md:flex gap-10">
            {/* Left */}
            <div className="relative">
              <div className="shadow-solid-6 p-6 rounded-xl xl:flex lg:flex md:flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap items-start">
                {/* Profile Image */}
                <div className="relative">
                  <div className="w-24 h-24 relative overflow-hidden rounded-full border-4 shadow-solid-6 border-white mx-auto z-[1]">
                    <div className="w-full h-full">
                      {!editMode && (
                        <Image src={userData.profileImage} width={110} height={125} alt="" className="object-cover"
                        />
                      )}
                      {editMode && (
                        <ImageUpload
                          width={110}
                          height={125}
                          onChange={(value) => { setUserData({ ...userData, profileImage: value[value.length - 1] }) }}
                          values={[userData.profileImage]}
                        />
                      )}

                    </div>
                    <div className="absolute bottom-0 flex mx-auto right-0 w-full h-6 overflow-hidden shadow bg-gray-500 ">
                      <input type="file" className="absolute top-0 right-0 w-full h-full z-10 opacity-0 cursor-pointer"
                        accept="image/png, image/gif, image/jpeg" disabled />
                      <div className="w-full h-full text-xl text-gray-400 flex justify-center items-center">
                        <span className="text-white w-4 h-4  text-md">
                          <Image src="/assets/faCamera.svg" alt="" width={25} height={25} className="object-contain" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Name & Description */}
                <form className="xl:w-[calc(100%-96px)] lg:w-[calc(100%-96px)] md:w-full w-full xl:pl-5 lg:pl-5 md:pl-0 md:pt-5 space-y-4">
                  {/* Name */}
                  <div className="flex w-full h-10 bg-white border border-slate-400 items-center px-2 rounded-xl">
                    <input
                      type="text"
                      name="name"
                      value={userData.name}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Name"
                      className="w-[calc(100%-16px)] h-10 border-0 bg-transparent focus:ring-0"
                    />
                    <div className="w-4 h-4" onClick={() => setEditMode(!editMode)}>
                      <Image src="/assets/edit.svg" width={16} height={16} alt="" className="w-full h-full object-contain cursor-pointer" />
                    </div>
                  </div>
                  {/* Description */}
                  <div className="flex w-full bg-white border border-slate-400 items-end px-2 py-2 rounded-xl">
                    <textarea
                      name="description"
                      value={userData.description}
                      onChange={handleChange}
                      disabled={!editMode}
                      placeholder="Tell Everyone About Yourself"
                      className="w-[calc(100%-16px)] h-60 resize-none border-0 text-sm bg-transparent focus:ring-0"
                    />
                    <div className="w-4 h-4" onClick={() => setEditMode(!editMode)}>
                      <Image src="/assets/edit.svg" width={16} height={16} alt="" className="w-full h-full object-contain cursor-pointer" />
                    </div>
                  </div>
                </form>
              </div>

              {/* Personal Details */}
              <div className="relative mt-10">
                <div className="text-2xl font-bold">Personal Details</div>
                <div className="relative space-y-3 mt-3 shadow-solid-6 p-6 rounded-xl">
                  {/* Title */}
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-slate-950">Title</div>
                    <select
                      name="title"
                      value={userData.title}
                      onChange={handleChange}
                      disabled={!editMode}
                      className="text-slate-600 bg-transparent border-2 border-slate-300 rounded-full focus:ring-1 focus:ring-slate-200 focus:border-slate-200 px-4 py-1 w-fit"
                    >
                      <option value="" disabled>Select Title</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                      <option value="Prof">Prof</option>
                    </select>
                  </div>

                  {/* Email */}
                  <div className="flex justify-between items-center ">
                    <div className="font-bold text-slate-950">Email</div>
                    <input
                      type="email"
                      name="email"
                      placeholder="Enter email"
                      value={userData.email}
                      onChange={handleChange}
                      disabled={true}
                      className="text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0 w-full"
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex justify-between items-center ">
                    <div className="font-bold text-slate-950">Phone</div>
                    <input
                      type="tel"
                      name="phone"
                      value={userData.phone}
                      placeholder="+91 99xxxxxx21"
                      onChange={handleChange}
                      disabled={!editMode}
                      className="text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                    />
                  </div>

                  {/* Language */}
                  <div className="flex justify-between items-center ">
                    <div className="font-bold text-slate-950">Languages</div>
                    <input
                      type="text"
                      name="language"
                      value={userData.language}
                      placeholder="Enter the languages"
                      onChange={handleChange}
                      disabled={!editMode}
                      className="text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                    />
                  </div>

                  {/* Location */}
                  <div className="flex justify-between items-center ">
                    <div className="font-bold text-slate-950">Location</div>
                    <input
                      type="text"
                      name="location"
                      placeholder="Enter the location"
                      value={userData.location}
                      onChange={handleChange}
                      disabled={!editMode}
                      className="text-slate-600 bg-transparent border-0 focus:ring-0 xl:text-right lg:text-right text-left px-0"
                    />
                  </div>
                </div>
              </div>
              {editMode && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="bg-black flex items-center justify-center mx-auto mt-4 text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center hover:opacity-90"
                  >
                    Save Changes
                  </button>

                </div>
              )}
              {!editMode && (<div className="mt-4">
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="bg-black flex items-center justify-center mx-auto mt-4 text-white px-6 py-2 font-semibold shadow-solid-6 rounded-full text-center hover:opacity-90"
                >
                  Edit Profile
                </button>

              </div>
              )}

            </div>

            {/* Right */}
            <div className="realtive xl:pt-8 lg:pt-8 md:pt-8 pt-24 space-y-20">
              {/* User Verification */}
              <div className="border border-x-slate-300 p-6 rounded-2xl">
                <div className="w-24 h-2w-24 flex justify-center mx-auto mt-[-65px]">
                  <Image src="/assets/check.svg" width={24} height={24} alt="" className="w-full h-full" />
                </div>
                <div className="text-center space-y-5">
                  <div className="text-xl text-center font-bold text-slate-950">User Verification</div>
                  <p className="text-base leading-tight">
                    Get verified effortlessly. We prioritize genuine listings, which is why
                    hosts are required to verify their identity to list spaces and
                    add payment details to receive payments.
                  </p>
                  <button type="button"
                    className="bg-black flex items-center justify-center mx-auto text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center hover:opacity-90">
                    Get Verified
                  </button>
                </div>
              </div>

              {/* User Verified */}
              <div className="border border-x-slate-300 p-6 rounded-2xl">
                <div className="w-24 h-2w-24 flex justify-center mx-auto mt-[-65px]">
                  <Image src="/assets/check.svg" width={24} height={24} alt="" className="w-full h-full" />
                </div>
                <div className="text-center space-y-5">
                  <div className="text-xl text-center font-bold text-slate-950">User Verified</div>
                  <p className="text-base leading-tight">
                    Your profile is verified, you can now
                    list your space and add payment details
                  </p>
                  <div className="flex xl:flex-nowrap lg:flex-nowrap md:flex-wrap flex-wrap">
                    <button type="button"
                      onClick={onRent}
                      className="bg-black flex items-center justify-center mx-auto text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center hover:opacity-90">
                      List Your Space
                    </button>
                    <button type="button"
                      className="bg-black flex items-center justify-center mx-auto text-white px-6 py-2 font-semibold shadow-lg rounded-full text-center hover:opacity-90">
                      Add Payment Details
                    </button>
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

export default ProfileClient;
