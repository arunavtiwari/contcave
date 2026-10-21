"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { IconType } from "react-icons";
import { LuCheck, LuCookie, LuSettings, LuShieldCheck } from "react-icons/lu";

import { useConsent } from "@/components/providers/ConsentProvider";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Switch from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

const CookieConsentBanner = () => {
    const { consent, isInitialized, updateConsent, acceptAll } = useConsent();
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
                    // Compact and anchored bottom-left so it never covers the WhatsApp / scroll buttons
                    // pinned bottom-right; on phones it stops short of that column.
                    className="fixed bottom-4 left-4 right-20 z-9999 md:bottom-6 md:left-6 md:right-auto md:max-w-sm"
                    role="dialog"
                    aria-label="Cookie preferences"
                >
                    <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-background/70 p-4 shadow-sm backdrop-blur-md">
                        <div className="relative z-10">
                            {!isManaging ? (
                                <>
                                    <div className="mb-1.5 flex items-center gap-2">
                                        <LuCookie size={18} className="shrink-0 text-foreground/80" aria-hidden="true" />
                                        <p className="text-sm font-semibold text-foreground">Cookie Preferences</p>
                                    </div>
                                    <div className="mb-3">
                                        <p className="text-xs leading-relaxed text-foreground/70">
                                            We use cookies to run the site, understand traffic and measure our ads. Choose what you&apos;re happy with.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button label="Accept all" size="sm" onClick={handleAcceptAll} />
                                        <Button
                                            label="Manage"
                                            size="sm"
                                            variant="outline"
                                            icon={LuSettings}
                                            onClick={() => setIsManaging(true)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="flex flex-col gap-2">
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
                "p-2 rounded-lg transition-all",
                checked ? "bg-background text-foreground" : " bg-foreground/5"
            )}>
                <Icon size={18} />
            </div>
            <div className="text-start">
                <Heading
                    title={title}
                    variant="h6"
                    className="text-sm!"
                    subtitle={description}
                    subtitleClassName="text-foreground/60!"
                />
            </div>
        </div>
        <div className="pointer-events-none">
            <Switch
                checked={checked}
                onChange={() => { }}
                disabled={disabled}
                size="sm"
            />
        </div>
    </Button>
);

export default CookieConsentBanner;
