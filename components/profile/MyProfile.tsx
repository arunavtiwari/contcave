"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    FaCreditCard,
    FaEnvelope,
    FaGlobe,
    FaHome,
    FaMapMarkerAlt,
    FaPhone,
    FaShieldAlt,
    FaSpinner,
    FaUser
} from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";

import { updateUser } from "@/app/actions/updateUser";
import CitySelect from "@/components/inputs/CitySelect";
import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/inputs/Input";
import Textarea from "@/components/inputs/Textarea";
import OwnerEnableModal from "@/components/modals/OwnerEnableModal";
import VerificationModal from "@/components/modals/VerificationModal";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import { PROFILE_LANGUAGE_OPTIONS, PROFILE_TITLE_OPTIONS } from "@/constants/user";
import useUIStore from "@/hooks/useUIStore";
import { uploadToR2 } from "@/lib/storage/upload";
import { isOwner } from "@/lib/user/permissions";
import { cn } from "@/lib/utils";
import { UserDataSchema } from "@/schemas/user";
import { SafeUser, UserRole } from "@/types/user";

interface ProfileClientProps {
    profile: SafeUser | null;
}

type FormValues = z.input<typeof UserDataSchema>;

const MyProfile: React.FC<ProfileClientProps> = ({ profile }) => {

    const [currentUser, setCurrentUser] = useState<SafeUser | null>(profile);
    const [isVerified, setIsVerified] = useState(profile?.is_verified || false);
    const [editMode, setEditMode] = useState(false);
    const [showOwnerModal, setShowOwnerModal] = useState(false);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const uiStore = useUIStore();
    const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);

    const form = useForm<FormValues>({
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
                profileImage: null,
                role: UserRole.CUSTOMER,
                is_verified: false,
                createdAt: new Date().toISOString(),
            } as unknown as FormValues;
            try {
                return {
                } as unknown as FormValues;
            } catch (_e) {
                return {
                    name: profile.name || "",
                    description: profile.description || "",
                    location: profile.location || "",
                    languages: profile.languages || [],
                    title: profile.title || "",
                    email: profile.email || "",
                    phone: profile.phone || "",
                    profileImage: profile.image || null,
                    role: profile.role || UserRole.CUSTOMER,
                    is_verified: profile.is_verified || false,
                    createdAt: profile.createdAt ? new Date(profile.createdAt).toISOString() : new Date().toISOString(),
                } as unknown as FormValues;
            }
        })()
    });

    const { register, handleSubmit, watch, setValue, getValues, formState: { errors, isSubmitting } } = form;
    const userData = watch();

    const onRent = () => {
        uiStore.onOpen("rent");
    };

    useEffect(() => {
        const user = profile;
        if (user) {
            setCurrentUser(user);
            try {
                const parsedData = UserDataSchema.parse(user);
                form.reset(parsedData as unknown as FormValues);
                setIsVerified(parsedData.is_verified);
            } catch (_e) {
                // Ignore parse errors on update
            }
        }
    }, [profile, form]);



    const handleOwnerSuccess = async (updatedUser: SafeUser) => {
        try {
            const parsed = UserDataSchema.parse(updatedUser);
            const safeData: FormValues = {
                ...parsed,
                createdAt: updatedUser.createdAt ? new Date(updatedUser.createdAt).toISOString() : new Date().toISOString()
            };

            form.reset(safeData);
            setIsVerified(!!safeData.is_verified);
            setCurrentUser(updatedUser);

            setShowLoadingOverlay(false);
            setShowVerificationModal(true);
        } catch (err: unknown) {
            console.error("Failed to process owner registration data:", err);
            setShowLoadingOverlay(false);
            toast.error("An error occurred while finalizing your registration.");
        }
    };

    const handleLanguageToggle = (language: string) => {
        const currentLanguages = getValues("languages") || [];
        const newLanguages = currentLanguages.includes(language)
            ? currentLanguages.filter((lang: string) => lang !== language)
            : currentLanguages.length < 2
                ? [...currentLanguages, language]
                : currentLanguages;
        setValue("languages", newLanguages, { shouldDirty: true, shouldValidate: true });
    };

    const handleTitleChange = (title: string) => {
        setValue("title", title, { shouldDirty: true, shouldValidate: true });
    };

    const onSubmit = async (data: FormValues) => {
        try {
            let finalProfileImage = data.profileImage;
            if (finalProfileImage && finalProfileImage.startsWith("blob:")) {
                const [uploadedUrl] = await uploadToR2([finalProfileImage], "profiles");
                finalProfileImage = uploadedUrl;
            }
            const validatedData = UserDataSchema.parse(data);
            const { name, description, location, languages, title, phone } = validatedData;

            await updateUser({
                name: name || undefined,
                description: description || undefined,
                location: location || undefined,
                languages: languages || undefined,
                title: title || undefined,
                phone: phone || undefined,
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
        <div className="flex flex-col w-full gap-8">
            <Heading title="My Profile" subtitle="Manage your profile information." />
            <div className="grid lg:grid-cols-3 gap-8">

                <div className="lg:col-span-2 space-y-8">

                    <div className="bg-background rounded-2xl border border-border overflow-hidden">

                        <div
                            className="relative h-24 bg-center bg-no-repeat bg-cover"
                            style={{ backgroundImage: "url('/images/banner.svg')" }}
                        >
                            <div className="absolute -bottom-12 left-8">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full border-4 border-background  overflow-hidden bg-background">
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
                                            <Avatar
                                                src={userData.profileImage}
                                                size={88}
                                                className="w-full h-full"
                                            />
                                        )}
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div className="pt-14 py-6 px-8">
                            <div className="flex justify-between mb-6 gap-8 items-center">
                                <div className="flex-1">
                                    <AnimatePresence mode="wait">
                                        {editMode ? (
                                            <motion.div
                                                key="edit-name"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex-1"
                                            >
                                                <Input
                                                    id="name"
                                                    register={register("name")}
                                                    errors={errors}
                                                    placeholder="Your name"
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="view-name"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex items-center gap-3"
                                            >
                                                <Heading title={userData.name || "Add your name"} variant="h4" className={!userData.name ? "text-muted-foreground/50 italic" : ""} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AnimatePresence>
                                        {editMode && (
                                            <motion.div
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 20 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <Button
                                                    label="Cancel"
                                                    onClick={() => {
                                                        form.reset();
                                                        setEditMode(false);
                                                    }}
                                                    variant="destructive"
                                                    outline
                                                    disabled={isSubmitting}
                                                    fit
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <Button
                                        label={editMode ? (isSubmitting ? 'Saving...' : 'Save Changes') : 'Edit Profile'}
                                        onClick={() => editMode ? handleSubmit(onSubmit)() : setEditMode(true)}
                                        variant="ghost"
                                        outline
                                        disabled={isSubmitting}
                                        loading={editMode && isSubmitting}
                                        fit
                                    />
                                </div>
                            </div>


                            <div className="mb-2">
                                <AnimatePresence mode="wait">
                                    {editMode ? (
                                        <motion.div
                                            key="edit-desc"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <Textarea
                                                id="description"
                                                {...register("description")}
                                                errors={errors}
                                                placeholder="Tell everyone about yourself..."
                                                className="h-32"
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="view-desc"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <p className="text-muted-foreground leading-relaxed text-sm">
                                                {userData.description || "No description added yet."}
                                            </p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>


                    <div className="bg-background rounded-2xl  border border-border p-8">
                        <Heading title="Personal Details" variant="h5" className="mb-6" />

                        <div className="space-y-6">

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaUser size={18} className="text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground text-sm">Title</span>
                                </div>
                                <AnimatePresence mode="wait">
                                    {editMode ? (
                                        <motion.div
                                            key="edit-title"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex gap-2"
                                        >
                                            {PROFILE_TITLE_OPTIONS.map((t) => (
                                                <Pill
                                                    key={t}
                                                    label={t}
                                                    onClick={() => handleTitleChange(t)}
                                                    variant={userData.title === t ? "solid" : "secondary"}
                                                    className="cursor-pointer min-w-14"
                                                />
                                            ))}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="view-title"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="text-foreground font-medium text-sm">{userData.title || "Not specified"}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>


                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaEnvelope size={18} className="text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground text-sm">Email</span>
                                </div>
                                <span className="text-foreground font-medium text-sm">{userData.email}</span>
                            </div>


                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <FaPhone size={18} className="text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground text-sm">Phone</span>
                                </div>
                                <div
                                    className={`flex items-center justify-end rounded-xl transition-all ${editMode ? 'pl-3 border border-border bg-background' : ''
                                        }`}
                                >
                                    <span className="mr-2 pr-2 border-r whitespace-nowrap text-sm text-muted-foreground">+91</span>
                                    <AnimatePresence mode="wait">
                                        {editMode ? (
                                            <motion.div
                                                key="edit-phone"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: 10 }}
                                                transition={{ duration: 0.2 }}
                                            >
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
                                                    className="w-28 h-9 p-0 border-none focus:ring-0 bg-transparent"
                                                    size="sm"
                                                />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="view-phone"
                                                initial={{ opacity: 0, x: 10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                <span className="text-foreground font-medium whitespace-nowrap text-sm">
                                                    {userData.phone || 'Not added'}
                                                </span>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>



                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <FaMapMarkerAlt size={18} className="text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground text-sm">City</span>
                                </div>
                                <AnimatePresence mode="wait">
                                    {editMode ? (
                                        <motion.div
                                            key="edit-city"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className="w-48"
                                        >
                                            <CitySelect
                                                size="sm"
                                                value={userData.location ? { label: userData.location, value: userData.location, state: "", latlng: [0, 0] } : undefined}
                                                onChange={(city) => setValue("location", city.label, { shouldDirty: true, shouldValidate: true })}
                                            />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="view-city"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span className="text-foreground font-medium text-sm">{userData.location || "Not specified"}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>


                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <FaGlobe size={18} className="text-muted-foreground/60" />
                                    <span className="font-medium text-muted-foreground text-sm">Languages</span>
                                </div>
                                <AnimatePresence mode="wait">
                                    {editMode ? (
                                        <motion.div
                                            key="edit-langs"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-wrap gap-2 max-w-xs justify-end"
                                        >
                                            {PROFILE_LANGUAGE_OPTIONS.map((language) => {
                                                const isSelected = (userData.languages || []).includes(language);
                                                const isDisabled = !isSelected && (userData.languages || []).length >= 2;
                                                return (
                                                    <Pill
                                                        key={language}
                                                        label={language}
                                                        onClick={() => {
                                                            if (isSelected || !isDisabled) {
                                                                handleLanguageToggle(language);
                                                            }
                                                        }}
                                                        variant={isSelected ? "solid" : "secondary"}
                                                        className={cn(
                                                            "cursor-pointer transition-all",
                                                            isDisabled && "opacity-30 cursor-not-allowed grayscale",
                                                            !isSelected && "hover:bg-neutral-100"
                                                        )}
                                                    />
                                                );
                                            })}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="view-langs"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex flex-wrap gap-2"
                                        >
                                            {(userData.languages || []).length > 0 ? (
                                                (userData.languages || []).map((language) => (
                                                    <Pill
                                                        key={language}
                                                        label={language}
                                                        variant="secondary"
                                                    />
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground/60">No languages specified</span>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Status Card */}
                <div className="space-y-6">
                    {!isOwner(userData.role) ? (
                        <div className="bg-muted/30 border border-foreground/10 rounded-2xl p-4">
                            <div className="text-center space-y-4">
                                <FaUser className="w-12 h-12 text-foreground mx-auto" />
                                <Heading
                                    title="Become an Owner"
                                    variant="h5"
                                    subtitle="Register yourself as a space owner to start hosting and get verified."
                                    center
                                />
                                <Button
                                    label="Register as Owner"
                                    onClick={() => setShowOwnerModal(true)}
                                    icon={FaUser}
                                />
                            </div>
                        </div>
                    ) : !isVerified ? (

                        <div className="bg-warning/5 border border-warning/20 rounded-2xl p-4">
                            <div className="text-center space-y-4">
                                <Image
                                    src="/images/icons/shield.png"
                                    width={48}
                                    height={48}
                                    alt="Verification"
                                    className="mx-auto object-contain"
                                />
                                <Heading
                                    title="Verification Pending"
                                    variant="h5"
                                    subtitle="Verify your details to unlock space owner features and start hosting."
                                    center
                                />
                                <div className="space-y-3">
                                    <Button
                                        label="Start Verification"
                                        onClick={() => setShowVerificationModal(true)}
                                        icon={FaShieldAlt}
                                        className="shadow-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (

                        <div className="bg-success/5 border border-success/20 rounded-2xl p-4">
                            <div className="text-center space-y-4">
                                <Image
                                    src="/images/icons/shield.png"
                                    width={48}
                                    height={48}
                                    alt="Verified"
                                    className="mx-auto"
                                />

                                <Heading title="Profile Verified" variant="h5" subtitle="Your profile is verified! You can now list spaces and manage payments." center />
                                <div className="space-y-3">
                                    <Button
                                        label="List Your Space"
                                        onClick={onRent}
                                        icon={FaHome}
                                        className="shadow-sm"
                                    />
                                    <Button
                                        label="Payment Details"
                                        href="/dashboard/payments"
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
            )}

            {currentUser && (
                <VerificationModal
                    isOpen={showVerificationModal}
                    onCloseAction={() => setShowVerificationModal(false)}
                    currentUser={currentUser}
                    onComplete={() => {
                        setValue("is_verified", true, { shouldValidate: true });
                        setIsVerified(true);

                        setCurrentUser((u: SafeUser | null) => u ? { ...u, is_verified: true } : null);
                    }}
                />
            )}
        </div>
    );
};

export default MyProfile;




