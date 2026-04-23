"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconType } from "react-icons";
import { IoMdClose } from "react-icons/io";
import { LuCheck, LuCookie, LuSettings, LuShieldCheck } from "react-icons/lu";

import { useConsent } from "@/components/providers/ConsentProvider";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import { cn } from "@/lib/utils";

const CookieConsentBanner = () => {
    const { consent, isInitialized, updateConsent, acceptAll, declineAll } = useConsent();
    const [isVisible, setIsVisible] = useState(false);
    const [isManaging, setIsManaging] = useState(false);
    const [tempConsent, setTempConsent] = useState(consent);

    useEffect(() => {
        if (isInitialized) {
            const hasConsent = document.cookie.includes("CC_CONSENT");
            if (!hasConsent) {
                const timer = setTimeout(() => setIsVisible(true), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [isInitialized]);

    useEffect(() => {
        setTempConsent(consent);
    }, [consent]);

    if (!isInitialized) return null;

    const handleSaveSettings = () => {
        updateConsent(tempConsent);
        setIsVisible(false);
        setIsManaging(false);
    };

    const handleAcceptAll = () => {
        acceptAll();
        setIsVisible(false);
    };

    const handleDeclineAll = () => {
        declineAll();
        setIsVisible(false);
    };

    const toggleType = (type: keyof typeof tempConsent) => {
        if (type === "necessary") return;
        setTempConsent((prev) => ({ ...prev, [type]: !prev[type] }));
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0, scale: 0.95 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 100, opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-9999"
                >
                    <div className="relative overflow-hidden bg-background/70 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm p-4 md:p-5">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-2 bg-foreground/5 rounded-xl text-foreground ring-1 ring-foreground/20">
                                    <LuCookie size={24} className="animate-pulse" />
                                </div>
                                <div className="w-full">
                                    <Heading
                                        title="Cookie Preference"
                                        variant="h5"
                                        subtitle="Privacy Control Center"
                                        subtitleClassName="text-foreground/60!"
                                    />
                                </div>
                                <Button
                                    icon={IoMdClose}
                                    isIconOnly
                                    variant="ghost"
                                    rounded
                                    onClick={() => setIsVisible(false)}
                                    size="sm"
                                />
                            </div>

                            {!isManaging ? (
                                <>
                                    <p className="text-foreground/60 text-sm leading-relaxed mb-8">
                                        We use premium cookies to enhance your journey, serve personalized experiences, and analyze our traffic. Your data security is our priority.
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                label="Accept All"
                                                variant="default"
                                                rounded
                                                size="lg"
                                                onClick={handleAcceptAll}
                                                className="shadow-lg shadow-foreground/10"
                                            />
                                            <Button
                                                label="Manage"
                                                variant="outline"
                                                rounded
                                                size="lg"
                                                icon={LuSettings}
                                                onClick={() => setIsManaging(true)}
                                            />
                                        </div>
                                        <button
                                            onClick={handleDeclineAll}
                                            className="py-2 text-muted-foreground hover:text-foreground text-xs font-semibold underline underline-offset-4 transition-all"
                                        >
                                            Decline non-essential
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="bg-secondary/30 rounded-3xl p-2 space-y-1">
                                        <ConsentToggle
                                            icon={LuShieldCheck}
                                            title="Strictly Necessary"
                                            description="Required for technical site operation."
                                            checked={tempConsent.necessary}
                                            disabled={true}
                                            onChange={() => { }}
                                        />
                                        <ConsentToggle
                                            icon={LuSettings}
                                            title="Analytics"
                                            description="Help us optimize the user experience."
                                            checked={tempConsent.analytics}
                                            onChange={() => toggleType("analytics")}
                                        />
                                        <ConsentToggle
                                            icon={LuCheck}
                                            title="Marketing"
                                            description="Personalized content and advertising."
                                            checked={tempConsent.marketing}
                                            onChange={() => toggleType("marketing")}
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <Button
                                            label="Save Preferences"
                                            variant="default"
                                            rounded
                                            size="lg"
                                            fit
                                            className="flex-1"
                                            onClick={handleSaveSettings}
                                        />
                                        <Button
                                            label="Back"
                                            variant="outline"
                                            rounded
                                            size="lg"
                                            onClick={() => setIsManaging(false)}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ConsentToggle = ({
    icon: Icon,
    title,
    description,
    checked,
    onChange,
    disabled = false,
}: {
    icon: IconType;
    title: string;
    description: string;
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}) => (
    <Button
        variant="ghost"
        disabled={disabled}
        onClick={onChange}
        className={cn(
            "flex items-center justify-between gap-4 p-4 rounded-2xl transition-all duration-300 h-auto w-full border-none",
            checked ? "bg-background/50 shadow-sm" : "hover:bg-background/30"
        )}
    >
        <div className="flex items-center gap-3">
            <div className={cn(
                "p-2 rounded-xl transition-colors",
                checked ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            )}>
                <Icon size={18} />
            </div>
            <div className="text-start">
                <Heading
                    title={title}
                    variant="h6"
                    className="font-sans! text-sm!"
                />
                <p className="text-[10px] text-muted-foreground leading-tight max-w-40">{description}</p>
            </div>
        </div>
        <div
            className={cn(
                "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all focus:outline-none ring-offset-background",
                checked ? "bg-primary" : "bg-muted",
                disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            )}
        >
            <span
                className={cn(
                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ease-in-out shadow-sm",
                    checked ? "translate-x-6" : "translate-x-1"
                )}
            />
        </div>
    </Button>
);

export default CookieConsentBanner;
