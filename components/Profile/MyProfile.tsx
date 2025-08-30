"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Image from "next/image";
import ImageUpload from "@/components/inputs/ImageUpload";
import useRentModal from "@/hook/useRentModal";
import useLoginModel from "@/hook/useLoginModal";
import { useRouter } from "next/navigation";
import Heading from "@/components/Heading";
import { toast } from "react-toastify";
import OwnerEnableModal from "@/components/modals/OwnerEnableModal";
import VerificationModal from "@/components/verification/VerificationModal";
import {
    FaUser,
    FaEnvelope,
    FaPhone,
    FaMapMarkerAlt,
    FaGlobe,
    FaCamera,
    FaEdit,
    FaSave,
    FaTimes,
    FaCheck,
    FaShieldAlt,
    FaPlus,
    FaHome,
    FaCreditCard
} from "react-icons/fa";

const ProfileClient = ({ profile }) => {
    const router = useRouter();
    const rentModel = useRentModal();
    const loginModel = useLoginModel();
    const [currentUser, setCurrentUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState("Profile");
    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);


    // Languages
    const languageOptions = [
        "English", "Hindi", "French", "German", "Italian",
        "Chinese", "Japanese", "Arabic", "Portuguese", "Russian"
    ];

    // Titles
    const titleOptions = ["Mr", "Mrs", "Ms", "Dr", "Prof"];

    useEffect(() => {
        const fetchUser = async () => {
            const user = profile;
            if (user) {
                setCurrentUser(user);
                setIsVerified(user.is_verified || false);
            }
        };
        fetchUser();
    }, []);

    const [userData, setUserData] = useState<{
        name: string;
        description: string;
        location: string;
        languages: string[];
        title: string;
        email: string;
        phone: string;
        profileImage: string;
        isOwner:boolean;
        isVerified: boolean;
        joinYear: string;
    }>({
        name: "",
        description: "",
        location: "",
        languages: [],
        title: "",
        email: "",
        phone: "",
        profileImage: "",
        isOwner: false,
        isVerified: false,
        joinYear: "",
    });

    const onRent = useCallback(() => {
        rentModel.onOpen();
    }, [currentUser, loginModel, rentModel]);

    useEffect(() => {
        const fetchUser = async () => {
            const user = profile;
            if (user) {
                setCurrentUser(user);
                setUserData({
                    name: user.name || "",
                    description: user.description || "",
                    location: user.location || "",
                    languages: user.languages || [],
                    title: user.title || "",
                    email: user.email || "",
                    phone: user.phone || "",
                    profileImage: user.profileImage || user.image || "/assets/default-profile.svg",
                    isOwner:user.is_owner,
                    isVerified: user.is_verified,
                    joinYear: user.createdAt
                        ? new Date(user.createdAt).toLocaleString("default", { month: "short", year: "numeric" })
                        : "Jun 2025"
                });
            }
        };
        fetchUser();
    }, []);


    const handleChange = (e) => {
        setUserData({ ...userData, [e.target.name]: e.target.value });
    };

    const handleLanguageToggle = (language) => {
        const newLanguages = userData.languages.includes(language)
            ? userData.languages.filter(lang => lang !== language)
            : userData.languages.length < 2
                ? [...userData.languages, language]
                : userData.languages;
        setUserData({ ...userData, languages: newLanguages });
    };

    const handleTitleChange = (title) => {
        setUserData({ ...userData, title });
    };

    const handleSave = async () => {
        try {
            await axios.put("/api/user", userData);
            setEditMode(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to update user data", error);
            toast.error("Failed to update profile");
        }
    };

    if (!currentUser) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full gap-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Heading title="My Profile" subtitle="Manage your personal information and preferences" />
                {isVerified && (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-200">
                        <FaShieldAlt className="w-4 h-4" />
                        <span className="text-sm font-medium">Verified</span>
                    </div>
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Profile Section */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Profile Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Profile Header */}
                        <div
                            className="relative h-32 bg-center bg-no-repeat bg-cover"
                            style={{ backgroundImage: "url('/images/banner.svg')" }}
                        >
                            <div className="absolute -bottom-16 left-8">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                                        {editMode ? (
                                            <ImageUpload
                                                onChange={(value) =>
                                                    setUserData({ ...userData, profileImage: value[value.length - 1] })
                                                }
                                                values={[userData.profileImage]}
                                                circle={true}
                                            />
                                        ) : (
                                            <Image
                                                src={userData.profileImage}
                                                width={128}
                                                height={128}
                                                alt="Profile"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                    {editMode && (
                                        <button className="absolute bottom-2 right-2 bg-black text-white p-2 rounded-full shadow-lg hover:bg-gray-800 transition-colors">
                                            <FaCamera className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Profile Content */}
                        <div className="pt-20 py-6 px-8">
                            <div className="flex justify-between mb-6 gap-8 items-center">
                                <div className="flex-1">
                                    {editMode ? (
                                        <input
                                            type="text"
                                            name="name"
                                            value={userData.name}
                                            onChange={handleChange}
                                            className="text-2xl font-bold text-gray-900 bg-transparent border border-gray-300 focus:border-black outline-none py-1.5 px-3 w-full rounded-lg"
                                            placeholder="Your name"
                                        />
                                    ) : (
                                        <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
                                    )}
                                </div>
                                <button
                                    onClick={() => editMode ? handleSave() : setEditMode(true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${editMode
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {editMode ? (
                                        <>
                                            <FaSave className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    ) : (
                                        <>
                                            <FaEdit className="w-4 h-4" />
                                            Edit Profile
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Description */}
                            <div className="mb-2">
                                {editMode ? (
                                    <textarea
                                        name="description"
                                        value={userData.description}
                                        onChange={handleChange}
                                        placeholder="Tell everyone about yourself..."
                                        className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none resize-none h-32"
                                    />
                                ) : (
                                    <p className="text-gray-600 leading-relaxed">
                                        {userData.description || "No description added yet."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Personal Details Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Personal Details</h3>

                        <div className="space-y-6">
                            {/* Title */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaUser className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Title</span>
                                </div>
                                {editMode ? (
                                    <div className="flex gap-2">
                                        {titleOptions.map((title) => (
                                            <button
                                                key={title}
                                                onClick={() => handleTitleChange(title)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${userData.title === title
                                                    ? 'bg-black text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {title}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-gray-900 font-medium">{userData.title || "Not specified"}</span>
                                )}
                            </div>

                            {/* Email */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaEnvelope className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Email</span>
                                </div>
                                <span className="text-gray-900 font-medium">{userData.email}</span>
                            </div>

                            {/* Phone */}
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FaPhone className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Phone</span>
                                </div>
                                <div
                                    className={`flex justify-end rounded-xl px-3 py-2 ${editMode ? 'border border-slate-300' : ''
                                        }`}
                                >
                                    <span className="mr-2 pr-2 border-r">+91</span>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={userData.phone}
                                        placeholder="99xxxxxx21"
                                        inputMode="numeric"
                                        maxLength={10}
                                        onChange={(e) => {
                                            const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            handleChange({ target: { name: 'phone', value: digitsOnly } });
                                        }}
                                        disabled={!editMode}
                                        className="bg-transparent focus:outline-none focus:ring-0 placeholder-slate-400 border-none w-28 h-fit p-0"
                                    />
                                </div>
                            </div>


                            {/* Location */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Location</span>
                                </div>
                                {editMode ? (
                                    <input
                                        type="text"
                                        name="location"
                                        value={userData.location}
                                        onChange={handleChange}
                                        className="border border-gray-300 rounded-xl px-3 py-2 w-48 focus:ring-2 focus:ring-black focus:border-transparent outline-none"
                                        placeholder="Enter location"
                                    />
                                ) : (
                                    <span className="text-gray-900 font-medium">{userData.location || "Not specified"}</span>
                                )}
                            </div>

                            {/* Languages */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <FaGlobe className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Languages</span>
                                </div>
                                {editMode ? (
                                    <div className="flex flex-wrap gap-2 max-w-xs justify-end">
                                        {languageOptions.map((language) => (
                                            <button
                                                key={language}
                                                onClick={() => handleLanguageToggle(language)}
                                                disabled={!userData.languages.includes(language) && userData.languages.length >= 2}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${userData.languages.includes(language)
                                                    ? 'bg-black text-white'
                                                    : userData.languages.length >= 2
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {userData.languages.includes(language) && <FaCheck className="w-3 h-3 inline mr-1" />}
                                                {language}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {userData.languages.length > 0 ? (
                                            userData.languages.map((language) => (
                                                <span key={language} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                                                    {language}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-gray-500">No languages specified</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    {/* Verification Status */}
                    {!isVerified ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                                    <FaShieldAlt className="w-8 h-8 text-orange-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-orange-900">Verification Pending</h3>
                                    <p className="text-orange-700 text-sm mt-2">
                                        Verify your details to unlock space owner features and start hosting.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        if (!userData?.isOwner) {
                                        setShowOwnerModal(true);
                                        } else {
                                        setShowVerificationModal(true);
                                        }
                                    }}
                                    className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 transition-colors"
                                    >
                                    Start Verification
                                    </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <FaCheck className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-green-900">Profile Verified</h3>
                                    <p className="text-green-700 text-sm mt-2">
                                        Your profile is verified! You can now list spaces and manage payments.
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <button
                                        onClick={onRent}
                                        className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaHome className="w-4 h-4" />
                                        List Your Space
                                    </button>
                                    <button
                                        onClick={() => router.push("/payment-details")}
                                        className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaCreditCard className="w-4 h-4" />
                                        Payment Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Stats */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Profile Completion</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                            style={{
                                                width: `${Math.round(
                                                    (Object.values(userData).filter(val => val && (Array.isArray(val) ? val.length > 0 : true)).length / Object.keys(userData).length) * 100
                                                )}%`
                                            }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {Math.round(
                                            (Object.values(userData).filter(val => val && (Array.isArray(val) ? val.length > 0 : true)).length / Object.keys(userData).length) * 100
                                        )}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Member Since</span>
                                <span className="text-gray-900 font-medium">{userData.joinYear}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        
            <OwnerEnableModal
                isOpen={showOwnerModal}
                onClose={() => setShowOwnerModal(false)}
                onSuccess={() => {
                    // refresh user locally or fetch again from server
                    setCurrentUser((u) => ({ ...u, is_owner: true }));
                    setShowOwnerModal(false);
                    setShowVerificationModal(true); // optionally immediately start verification
                }}
                initialEmail={userData.email}
                initialPhone={userData.phone}
                />

        {currentUser && (
        <VerificationModal
            isOpen={showVerificationModal}
            onClose={() => setShowVerificationModal(false)}
            currentUser={currentUser}
            onComplete={() => {
            // update state after verification
            setCurrentUser((u) => ({ ...u, is_verified: true }));
            setIsVerified(true);
            }}
        />
        )}
        </div>
    );

};

export default ProfileClient;

