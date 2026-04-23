"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconType } from "react-icons";
import { IoMdClose } from "react-icons/io";
import { LuCheck, LuCookie, LuSettings, LuShieldCheck } from "react-icons/lu";

import Switch from "@/components/inputs/Switch";
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
                    className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-120 z-9999"
                >
                    <div className="relative overflow-hidden bg-background/70 backdrop-blur-md border border-border/50 rounded-2xl shadow-sm p-4">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-2 bg-foreground/5 rounded-lg text-foreground ring-1 ring-foreground/20">
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
                                    variant="ghost"
                                    rounded
                                    onClick={() => setIsVisible(false)}
                                    size="sm"
                                    fit
                                    className="h-fit! mb-3!"
                                />
                            </div>

                            {!isManaging ? (
                                <>
                                    <p className="text-foreground/60 text-sm leading-relaxed mb-8 text-center">
                                        We use premium cookies to enhance your journey, serve personalized experiences, and analyze our traffic. Your data security is our priority.
                                    </p>
                                    <div className="flex flex-col gap-5">
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                label="Accept All"
                                                onClick={handleAcceptAll}
                                            />
                                            <Button
                                                label="Manage"
                                                variant="outline"
                                                icon={LuSettings}
                                                onClick={() => setIsManaging(true)}
                                            />
                                        </div>
                                        <Button
                                            label="Decline non-essential"
                                            variant="ghost"
                                            size="sm"
                                            fit
                                            onClick={handleDeclineAll}
                                            className="text-muted-foreground hover:text-foreground text-xs font-semibold underline underline-offset-4 mx-auto h-fit!"
                                        />
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
                                            onClick={handleSaveSettings}
                                        />
                                        <Button
                                            label="Back"
                                            variant="outline"
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
                checked ? "bg-foreground/20 text-foreground" : "bg-muted text-muted-foreground"
            )}>
                <Icon size={18} />
            </div>
            <div className="text-start">
                <Heading
                    title={title}
                    variant="h6"
                    className="text-sm!"
                />
                <p className="text-[10px] text-muted-foreground leading-tight max-w-40">{description}</p>
            </div>
        </div>
        <div className="pointer-events-none">
            <Switch
                checked={checked}
                onChange={() => { }}
                disabled={disabled}
            />
        </div>
    </Button>
);

export default CookieConsentBanner;
