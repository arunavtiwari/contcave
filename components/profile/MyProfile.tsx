"use client";

import axios from "axios";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
    FaCamera,
    FaCheck,
    FaCreditCard,
    FaEdit,
    FaEnvelope,
    FaGlobe,
    FaHome,
    FaMapMarkerAlt,
    FaPhone,
    FaSave,
    FaShieldAlt,
    FaSpinner,
    FaUser
} from "react-icons/fa";
import { toast } from "react-toastify";

import ImageUpload from "@/components/inputs/ImageUpload";
import OwnerEnableModal from "@/components/modals/OwnerEnableModal";
import VerificationModal from "@/components/modals/VerificationModal";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { PROFILE_LANGUAGE_OPTIONS, PROFILE_TITLE_OPTIONS } from "@/constants/user";
import useRentModal from "@/hook/useRentModal";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { UserDataBoundaryPayload, UserDataSchema } from "@/lib/schemas/user";
import { SafeUser } from "@/types/user";

interface ProfileClientProps {
    profile: SafeUser | null;
}

const MyProfile: React.FC<ProfileClientProps> = ({ profile }) => {

    const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const rentModel = useRentModal();
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

    const [userData, setUserData] = useState<UserDataBoundaryPayload>({
        name: "",
        description: "",
        location: "",
        languages: [],
        title: "",
        email: "",
        phone: "",
        profileImage: "",
        is_owner: false,
        is_verified: false,
        joinYear: "",
    });

    const onRent = useCallback(() => {
        rentModel.onOpen();
    }, [rentModel]);

    useEffect(() => {
        const user = profile;
        if (user) {
            setCurrentUser(user);
            const parsedData = UserDataSchema.parse(user);
            setUserData(parsedData);
        }
    }, [profile]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setUserData({ ...userData, [e.target.name]: e.target.value });
    };

    const handleLanguageToggle = (language: string) => {
        const newLanguages = userData.languages.includes(language)
            ? userData.languages.filter(lang => lang !== language)
            : userData.languages.length < 2
                ? [...userData.languages, language]
                : userData.languages;
        setUserData({ ...userData, languages: newLanguages });
    };

    const handleTitleChange = (title: string) => {
        setUserData({ ...userData, title });
    };

    const handleSave = async () => {
        try {
            let finalProfileImage = userData.profileImage;
            if (finalProfileImage && finalProfileImage.startsWith("blob:")) {
                const [uploadedUrl] = await uploadToCloudinary([finalProfileImage], "profiles");
                finalProfileImage = uploadedUrl;
            }
            const { name, description, location, languages, title, phone } = userData;
            await axios.put("/api/user", {
                name, description, location, languages, title, phone,
                profileImage: finalProfileImage || null,
            });
            setUserData(prev => ({ ...prev, profileImage: finalProfileImage }));
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

                <div className="lg:col-span-2 space-y-8">

                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 overflow-hidden">

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
                                                values={userData.profileImage ? [userData.profileImage] : []}
                                                circle={true}
                                                deferUpload
                                            />
                                        ) : (
                                            <Image
                                                src={userData.profileImage || "/assets/default-profile.svg"}
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



                        <div className="pt-20 py-6 px-8">
                            <div className="flex justify-between mb-6 gap-8 items-center">
                                <div className="flex-1">
                                    {editMode ? (
                                        <Input
                                            id="name"
                                            name="name"
                                            value={userData.name}
                                            onChange={handleChange}
                                            className="text-2xl font-bold"
                                            placeholder="Your name"
                                        />
                                    ) : (
                                        <h2 className="text-2xl font-bold text-gray-900">{userData.name}</h2>
                                    )}
                                </div>
                                <button
                                    onClick={() => editMode ? handleSave() : setEditMode(true)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${editMode
                                        ? 'bg-black text-white hover:bg-gray-800'
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


                            <div className="mb-2">
                                {editMode ? (
                                    <Textarea
                                        id="description"
                                        name="description"
                                        value={userData.description}
                                        onChange={handleChange}
                                        placeholder="Tell everyone about yourself..."
                                        className="h-32"
                                    />
                                ) : (
                                    <p className="text-gray-600 leading-relaxed">
                                        {userData.description || "No description added yet."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>


                    <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-6">Personal Details</h3>

                        <div className="space-y-6">

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaUser className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Title</span>
                                </div>
                                {editMode ? (
                                    <div className="flex gap-2">
                                        {PROFILE_TITLE_OPTIONS.map((title) => (
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


                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaEnvelope className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Email</span>
                                </div>
                                <span className="text-gray-900 font-medium">{userData.email}</span>
                            </div>


                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FaPhone className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Phone</span>
                                </div>
                                <div
                                    className={`flex items-center justify-end rounded-xl ${editMode ? 'px-3 py-2 border border-slate-300' : ''
                                        }`}
                                >
                                    <span className="mr-2 pr-2 border-r whitespace-nowrap">+91</span>
                                    {editMode ? (
                                        <Input
                                            id="phone"
                                            name="phone"
                                            type="tel"
                                            value={userData.phone}
                                            placeholder="99xxxxxx21"
                                            maxLength={10}
                                            onChange={(e) => {
                                                const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                handleChange({ target: { name: 'phone', value: digitsOnly } } as unknown as React.ChangeEvent<HTMLInputElement>);
                                            }}
                                            className="w-28 p-0 border-none focus:ring-0"
                                        />
                                    ) : (
                                        <span className="text-gray-900 font-medium whitespace-nowrap">
                                            {userData.phone || 'Not added'}
                                        </span>
                                    )}
                                </div>
                            </div>



                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Location</span>
                                </div>
                                {editMode ? (
                                    <Input
                                        id="location"
                                        name="location"
                                        value={userData.location}
                                        onChange={handleChange}
                                        className="w-48"
                                        placeholder="Enter location"
                                    />
                                ) : (
                                    <span className="text-gray-900 font-medium">{userData.location || "Not specified"}</span>
                                )}
                            </div>


                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <FaGlobe className="w-5 h-5 text-gray-400" />
                                    <span className="font-medium text-gray-700">Languages</span>
                                </div>
                                {editMode ? (
                                    <div className="flex flex-wrap gap-2 max-w-xs justify-end">
                                        {PROFILE_LANGUAGE_OPTIONS.map((language) => (
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


                <div className="space-y-6">
                    {!userData.is_owner ? (

                        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <FaUser className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-900">Become an Owner</h3>
                                    <p className="text-blue-700 text-sm mt-2">
                                        Register yourself as a space owner to start hosting and get verified.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowOwnerModal(true)}
                                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Register as Owner
                                </button>
                            </div>
                        </div>
                    ) : !isVerified ? (

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
                                    onClick={() => setShowVerificationModal(true)}
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
                                    <Link
                                        href="/profile?tab=manage-payments"
                                        className="w-full bg-gray-100 text-gray-900 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <FaCreditCard className="w-4 h-4" />
                                        Payment Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>


            </div>

            <OwnerEnableModal
                isOpen={showOwnerModal}
                onClose={() => setShowOwnerModal(false)}
                onLoadingStart={() => {
                    setShowLoadingOverlay(true);
                }}
                onSuccess={(newPhone?: string, _newEmail?: string) => {
                    const payload = {
                        name: userData.name,
                        description: userData.description,
                        location: userData.location,
                        languages: userData.languages,
                        title: userData.title,
                        profileImage: userData.profileImage,
                        phone: newPhone || userData.phone,
                        is_owner: true,
                    };

                    axios.put("/api/user", payload)
                        .then((res) => {
                            const updatedUser = res.data;

                            // Immediately validate the incoming user data right at the network boundary
                            const safeData = UserDataSchema.parse(updatedUser);
                            setUserData(safeData);
                            setCurrentUser(updatedUser);


                            setTimeout(() => {
                                setShowLoadingOverlay(false);
                                setShowVerificationModal(true);
                            }, 1500);
                        })
                        .catch((err) => {
                            console.error("Failed to update owner status:", err);
                            setShowLoadingOverlay(false);
                            toast.error(err?.response?.data?.error || "Failed to update owner status");
                        });
                }}
                initialEmail={userData.email}
                initialPhone={userData.phone}
            />



            {showLoadingOverlay && (
                <div className="fixed inset-0 z-1000 bg-black/60 backdrop-blur-md flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <FaSpinner className="w-12 h-12 text-white animate-spin" />
                        <p className="text-xl font-semibold text-white">Starting Verification...</p>
                    </div>
                </div>
            )}

            {currentUser && (
                <VerificationModal
                    isOpen={showVerificationModal}
                    onClose={() => setShowVerificationModal(false)}
                    currentUser={currentUser}
                    onComplete={() => {

                        setUserData((u) => ({ ...u, is_verified: true }));
                        setIsVerified(true);

                        setCurrentUser((u) => u ? { ...u, is_verified: true } : null);
                    }}
                />
            )}
        </div>
    );

};

export default MyProfile;

