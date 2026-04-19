"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { toast } from "sonner";
import { z } from "zod";

import { updateUser } from "@/app/actions/updateUser";
import ImageUpload from "@/components/inputs/ImageUpload";
import OwnerEnableModal from "@/components/modals/OwnerEnableModal";
import VerificationModal from "@/components/modals/VerificationModal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import Pill from "@/components/ui/Pill";
import Textarea from "@/components/ui/Textarea";
import { PROFILE_LANGUAGE_OPTIONS, PROFILE_TITLE_OPTIONS } from "@/constants/user";
import useRentModal from "@/hook/useRentModal";
import { uploadToR2 } from "@/lib/storage/upload";
import { UserDataBoundaryPayload, UserDataSchema, userUpdateSchema } from "@/schemas/user";
import { SafeUser } from "@/types/user";

interface ProfileClientProps {
    profile: SafeUser | null;
}

const MyProfile: React.FC<ProfileClientProps> = ({ profile }) => {

    const [currentUser, setCurrentUser] = useState<SafeUser | null>(profile);
    const [isVerified, setIsVerified] = useState(profile?.is_verified || false);
    const [editMode, setEditMode] = useState(false);
    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const rentModel = useRentModal();
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

    const form = useForm<z.input<typeof UserDataSchema>, unknown, UserDataBoundaryPayload>({
        resolver: zodResolver(UserDataSchema),
        defaultValues: (() => {
            if (!profile) return {
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
            };
            try {
                return UserDataSchema.parse(profile);
            } catch (_e) {
                return {
                    name: profile.name || "",
                    description: profile.description || "",
                    location: profile.location || "",
                    languages: profile.languages || [],
                    title: profile.title || "",
                    email: profile.email || "",
                    phone: profile.phone || "",
                    profileImage: profile.image || "",
                    is_owner: profile.is_owner || false,
                    is_verified: profile.is_verified || false,
                    joinYear: profile.createdAt ? new Date(profile.createdAt).getFullYear().toString() : "",
                };
            }
        })()
    });

    const { register, handleSubmit, watch, setValue, getValues, formState: { errors, isSubmitting } } = form;
    const userData = watch();

    const onRent = () => {
        rentModel.onOpen();
    };

    useEffect(() => {
        const user = profile;
        if (user) {
            setCurrentUser(user);
            try {
                const parsedData = UserDataSchema.parse(user);
                form.reset(parsedData);
                setIsVerified(parsedData.is_verified);
            } catch (_e) {
                // Ignore parse errors on update
            }
        }
    }, [profile, form]);



    const handleOwnerSuccess = async (newPhone?: string) => {
        const payload: z.infer<typeof userUpdateSchema> = {
            name: (userData.name ?? undefined) || undefined,
            description: (userData.description ?? undefined) || undefined,
            location: (userData.location ?? undefined) || undefined,
            languages: (userData.languages ?? undefined) || undefined,
            title: (userData.title ?? undefined) || undefined,
            profileImage: (userData.profileImage ?? undefined) || undefined,
            phone: (newPhone ?? userData.phone ?? undefined) || undefined,
            is_owner: true,
        };

        try {
            const updatedUser = await updateUser(payload);
            const safeData = UserDataSchema.parse(updatedUser);

            form.reset(safeData);
            setIsVerified(safeData.is_verified);
            setCurrentUser(updatedUser);

            setShowLoadingOverlay(false);
            setShowVerificationModal(true);
        } catch (err: unknown) {
            console.error("Failed to update owner status:", err);
            setShowLoadingOverlay(false);
            const message = err instanceof Error ? err.message : "Failed to update owner status";
            toast.error(message);
        }
    };

    const handleLanguageToggle = (language: string) => {
        const currentLanguages = getValues("languages") || [];
        const newLanguages = currentLanguages.includes(language)
            ? currentLanguages.filter(lang => lang !== language)
            : currentLanguages.length < 2
                ? [...currentLanguages, language]
                : currentLanguages;
        setValue("languages", newLanguages, { shouldDirty: true, shouldValidate: true });
    };

    const handleTitleChange = (title: string) => {
        setValue("title", title, { shouldDirty: true, shouldValidate: true });
    };

    const onSubmit = async (data: UserDataBoundaryPayload) => {
        try {
            let finalProfileImage = data.profileImage;
            if (finalProfileImage && finalProfileImage.startsWith("blob:")) {
                const [uploadedUrl] = await uploadToR2([finalProfileImage], "profiles");
                finalProfileImage = uploadedUrl;
            }
            const { name, description, location, languages, title, phone } = data;
            await updateUser({
                name, description, location, languages, title, phone,
                profileImage: finalProfileImage || null,
            });
            setValue("profileImage", finalProfileImage as string);
            setEditMode(false);
            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to update user data", error);
            const message = error instanceof Error ? error.message : "Failed to update profile";
            toast.error(message);
        }
    };

    if (!currentUser) {
        return null;
    }

    return (
        <div className="flex flex-col w-full gap-5">

            <div className="flex items-center justify-between">
                <Heading title="My Profile" subtitle="Manage your personal information and preferences" />
                {isVerified && (
                    <Pill
                        label="Verified"
                        icon={FaShieldAlt}
                        color="success"
                        variant="subtle"
                    />
                )}
            </div>

            <div className="grid lg:grid-cols-3 gap-8">

                <div className="lg:col-span-2 space-y-8">

                    <div className="bg-background rounded-2xl border border-border overflow-hidden">

                        <div
                            className="relative h-32 bg-center bg-no-repeat bg-cover"
                            style={{ backgroundImage: "url('/images/banner.svg')" }}
                        >
                            <div className="absolute -bottom-16 left-8">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-full border-4 border-background  overflow-hidden bg-background">
                                        {editMode ? (
                                            <ImageUpload
                                                onChange={(value) => {
                                                    if (value.length > 0) {
                                                        setValue("profileImage", value[value.length - 1], { shouldDirty: true, shouldValidate: true });
                                                    }
                                                }}
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
                                        <button className="absolute bottom-2 right-2 bg-foreground text-background p-2 rounded-full hover:bg-foreground/80 transition-colors shadow-lg">
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
                                            register={register("name")}
                                            errors={errors}
                                            className="text-2xl font-bold p-0 border-0 focus:ring-0"
                                            placeholder="Your name"
                                        />
                                    ) : (
                                        <Heading title={userData.name} variant="h3" />
                                    )}
                                </div>
                                {editMode && (
                                    <Button
                                        label="Cancel"
                                        onClick={() => {
                                            form.reset();
                                            setEditMode(false);
                                        }}
                                        variant="outline"
                                        disabled={isSubmitting}
                                    />
                                )}
                                <Button
                                    label={editMode ? (isSubmitting ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
                                    onClick={() => editMode ? handleSubmit(onSubmit)() : setEditMode(true)}
                                    icon={editMode ? (isSubmitting ? FaSpinner : FaSave) : FaEdit}
                                    variant={editMode ? "default" : "outline"}
                                    disabled={isSubmitting}
                                    loading={editMode && isSubmitting}
                                />
                                控制                            </div>


                            <div className="mb-2">
                                {editMode ? (
                                    <Textarea
                                        id="description"
                                        {...register("description")}
                                        errors={errors}
                                        placeholder="Tell everyone about yourself..."
                                        className="h-32"
                                    />
                                ) : (
                                    <p className="text-muted-foreground leading-relaxed">
                                        {userData.description || "No description added yet."}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>


                    <div className="bg-background rounded-2xl  border border-border p-8">
                        <Heading title="Personal Details" variant="h5" className="mb-6" />

                        <div className="space-y-6">

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaUser className="w-5 h-5 text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground">Title</span>
                                </div>
                                {editMode ? (
                                    <div className="flex gap-2">
                                        {PROFILE_TITLE_OPTIONS.map((title) => (
                                            <button
                                                key={title}
                                                type="button"
                                                onClick={() => handleTitleChange(title)}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${userData.title === title
                                                    ? 'bg-foreground text-background shadow-sm'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                    }`}
                                            >
                                                {title}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <span className="text-foreground font-medium">{userData.title || "Not specified"}</span>
                                )}
                            </div>


                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaEnvelope className="w-5 h-5 text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground">Email</span>
                                </div>
                                <span className="text-foreground font-medium">{userData.email}</span>
                            </div>


                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FaPhone className="w-5 h-5 text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground">Phone</span>
                                </div>
                                <div
                                    className={`flex items-center justify-end rounded-xl ${editMode ? 'px-3 py-2 border border-slate-300' : ''
                                        }`}
                                >
                                    <span className="mr-2 pr-2 border-r whitespace-nowrap">+91</span>
                                    {editMode ? (
                                        <Input
                                            id="phone"
                                            type="tel"
                                            register={register("phone", {
                                                onChange: (e) => {
                                                    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setValue("phone", digitsOnly, { shouldDirty: true, shouldValidate: true });
                                                }
                                            })}
                                            errors={errors}
                                            placeholder="99xxxxxx21"
                                            maxLength={10}
                                            className="w-28 p-0 border-none focus:ring-0"
                                        />
                                    ) : (
                                        <span className="text-foreground font-medium whitespace-nowrap">
                                            {userData.phone || 'Not added'}
                                        </span>
                                    )}
                                </div>
                            </div>



                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt className="w-5 h-5 text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground">Location</span>
                                </div>
                                {editMode ? (
                                    <Input
                                        id="location"
                                        register={register("location")}
                                        errors={errors}
                                        className="w-48"
                                        placeholder="Enter location"
                                    />
                                ) : (
                                    <span className="text-foreground font-medium">{userData.location || "Not specified"}</span>
                                )}
                            </div>


                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <FaGlobe className="w-5 h-5 text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground">Languages</span>
                                </div>
                                {editMode ? (
                                    <div className="flex flex-wrap gap-2 max-w-xs justify-end">
                                        {PROFILE_LANGUAGE_OPTIONS.map((language) => (
                                            <button
                                                key={language}
                                                onClick={() => handleLanguageToggle(language)}
                                                disabled={!(userData.languages || []).includes(language) && (userData.languages || []).length >= 2}
                                                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${(userData.languages || []).includes(language)
                                                    ? 'bg-foreground text-background'
                                                    : (userData.languages || []).length >= 2
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {(userData.languages || []).includes(language) && <FaCheck className="w-3 h-3 inline mr-1" />}
                                                {language}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(userData.languages || []).length > 0 ? (
                                            (userData.languages || []).map((language) => (
                                                <Pill
                                                    key={language}
                                                    label={language}
                                                    variant="subtle"
                                                    size="sm"
                                                />
                                            ))
                                        ) : (
                                            <span className="text-muted-foreground/60">No languages specified</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>


                <div className="space-y-6">
                    {!userData.is_owner ? (

                        <div className="bg-foreground/5 border border-foreground/20 rounded-2xl p-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-foreground/10 rounded-full flex items-center justify-center mx-auto">
                                    <FaUser className="w-8 h-8 text-foreground" />
                                </div>
                                <div>
                                    <Heading title="Become an Owner" variant="h6" className="text-foreground" />
                                    <p className="text-muted-foreground text-sm mt-2">
                                        Register yourself as a space owner to start hosting and get verified.
                                    </p>
                                </div>
                                <Button
                                    label="Register as Owner"
                                    onClick={() => setShowOwnerModal(true)}
                                    classNames="shadow-sm"
                                />
                            </div>
                        </div>
                    ) : !isVerified ? (

                        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
                                    <FaShieldAlt className="w-8 h-8 text-warning" />
                                </div>
                                <div>
                                    <Heading title="Verification Pending" variant="h6" className="text-warning-900" />
                                    <p className="text-muted-foreground text-sm mt-2">
                                        Verify your details to unlock space owner features and start hosting.
                                    </p>
                                </div>
                                <Button
                                    label="Start Verification"
                                    onClick={() => setShowVerificationModal(true)}
                                    classNames="shadow-sm"
                                />
                            </div>
                        </div>
                    ) : (

                        <div className="bg-success/5 border border-success/20 rounded-2xl p-6">
                            <div className="text-center space-y-4">
                                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                                    <FaCheck className="w-8 h-8 text-success" />
                                </div>
                                <Heading title="Profile Verified" variant="h5" subtitle="Your profile is verified! You can now list spaces and manage payments." center />
                                <div className="space-y-3">
                                    <Button
                                        label="List Your Space"
                                        onClick={onRent}
                                        icon={FaHome}
                                        classNames="shadow-sm"
                                    />
                                    <Button
                                        label="Payment Details"
                                        href="/profile?tab=manage-payments"
                                        icon={FaCreditCard}
                                        variant="outline"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>


            </div>

            <OwnerEnableModal
                isOpen={showOwnerModal}
                onClose={() => setShowOwnerModal(false)}
                onLoadingStart={() => setShowLoadingOverlay(true)}
                onSuccess={handleOwnerSuccess}
                initialEmail={userData.email || undefined}
                initialPhone={userData.phone || undefined}
            />


            {showLoadingOverlay && (
                <div className="fixed inset-0 z-1000 bg-foreground/60 backdrop-blur-md flex items-center justify-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <FaSpinner className="w-12 h-12 text-background animate-spin" />
                        <p className="text-xl font-semibold text-background">Starting Verification...</p>
                    </div>
                </div>
            )
            }

            {
                currentUser && (
                    <VerificationModal
                        isOpen={showVerificationModal}
                        onClose={() => setShowVerificationModal(false)}
                        currentUser={currentUser}
                        onComplete={() => {
                            setValue("is_verified", true, { shouldValidate: true });
                            setIsVerified(true);

                            setCurrentUser((u: SafeUser | null) => u ? { ...u, is_verified: true } : null);
                        }}
                    />
                )
            }
        </div >
    );

};

export default MyProfile;


