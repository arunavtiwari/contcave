"use client";

import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import MyProfile from "@/components/Profile/MyProfile";
import ManagePayments from "@/components/Profile/ManagePayments/ManagePayments";
import ShareAndRefer from "@/components/Profile/ShareAndRefer";
import Settings from "@/components/Profile/ProfileSettings";

const ProfileClient = ({ profile }) => {
  const [selectedMenu, setSelectedMenu] = useState("Profile");

  const renderSelectedComponent = () => {
    switch (selectedMenu) {
      case "Profile":
        return <MyProfile profile={profile} />;
      case "Manage Payments":
        return <ManagePayments profile={profile} />;
      case "Share & Refer":
        return <ShareAndRefer profile={profile} />;
      case "Settings":
        return <Settings profile={profile} />;
      default:
        return <MyProfile profile={profile} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar
        selectedMenu={selectedMenu}
        setSelectedMenu={setSelectedMenu}
        menuType="profile"
      />

      {/* Main Content Area */}
      <div className="flex flex-col sm:p-8 sm:pt-12 w-full gap-5 sm:border-l-2 border-gray-200">
        {renderSelectedComponent()}
      </div>
    </div>
  );
};

export default ProfileClient;