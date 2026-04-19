"use client";
import React, { useCallback, useState } from "react";
import {
    FaInstagram,
    FaWhatsapp
} from "react-icons/fa";
import {
    MdContentCopy,
    MdMessage,
    MdShare
} from "react-icons/md";
import { toast } from "sonner";

import Heading from "@/components/ui/Heading";
import { getBaseUrl } from "@/lib/utils/getBaseUrl";
import { SafeUser } from "@/types/user";

interface Props {
    profile: SafeUser | null;
}

const ShareAndRefer: React.FC<Props> = ({ profile }) => {
    const [copied, setCopied] = useState(false);
    const [isSharing, setIsSharing] = useState(false);

    const generateReferralCode = useCallback((user: SafeUser | null): string => {
        if (!user) return "";
        const base = user.email || user.id;
        const hash = Buffer.from(base).toString("base64").replace(/[^a-zA-Z0-9]/g, "");
        return hash.slice(0, 8).toUpperCase();
    }, []);

    const referralCode = generateReferralCode(profile);
    const referralLink = `${getBaseUrl()}/signup?ref=${referralCode}`;

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setCopied(true);
            toast.success("Referral link copied to clipboard!", {
                position: "top-center",




            });
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy text: ", err);
            toast.error("Failed to copy link. Please try again.", {
                position: "top-center",
            });
        }
    }, [referralLink]);

    const handleNativeShare = useCallback(async () => {
        if (!navigator.share) {
            handleCopy();
            return;
        }

        setIsSharing(true);
        try {
            await navigator.share({
                title: "Join ContCave and Get Rewards!",
                text: "Join me on ContCave using my referral link and we both get rewards!",
                url: referralLink,
            });
            toast.success("Link shared successfully!", {
                position: "top-center",
            });
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                console.error("Error sharing:", err);
                toast.error("Failed to share. Link copied instead!", {
                    position: "top-center",
                });
                handleCopy();
            }
        } finally {
            setIsSharing(false);
        }
    }, [referralLink, handleCopy]);

    const handleSocialShare = useCallback((platform: string) => {
        const text = encodeURIComponent("Join me on ContCave using my referral link and we both get rewards!");
        const url = encodeURIComponent(referralLink);

        let shareUrl = "";

        switch (platform) {
            case "whatsapp":
                shareUrl = `https://wa.me/?text=${text}%20${url}`;
                break;
            case "instagram":
                handleCopy();
                toast.info("Link copied! Paste it in your Instagram story or bio.", {
                    position: "top-center",
                });
                return;
            case "messages":
                shareUrl = `sms:?&body=${text}%20${url}`;
                break;
            default:
                return;
        }

        window.open(shareUrl, "_blank", "noopener,noreferrer");
    }, [referralLink, handleCopy]);

    return (
        <div className="flex flex-col w-full mx-auto space-y-8">
            <Heading
                title="Share with Friends and Earn Rewards ðŸ™Œ"
                subtitle="Refer your friends to ContCave and both of you can earn rewards"
            />

            <div className="bg-foreground/5 rounded-2xl p-6 border border-foreground/20">
                <Heading title="How It Works" variant="h5" className="mb-6" />
                <ol className="space-y-4 text-muted-foreground">
                    <li className="flex items-start">
                        <span className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 shrink-0 shadow-sm">1</span>
                        <span className="font-medium">Share your unique referral link or code with friends.</span>
                    </li>
                    <li className="flex items-start">
                        <span className="bg-foreground text-background rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 shrink-0 shadow-sm">2</span>
                        <span className="font-medium">When someone signs up and books their first space using your referral link, you both earn rewards!</span>
                    </li>
                </ol>
            </div>

            <div className="bg-background rounded-xl border border-border p-6 ">
                <h3 className="text-lg font-semibold text-foreground mb-4">Your Referral Link</h3>

                <div className="space-y-4">
                    <div className="bg-muted rounded-lg p-4 border border-border">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground mb-1">Referral Code</p>
                                <p className="text-lg font-mono font-semibold text-foreground truncate">
                                    {referralCode}
                                </p>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="ml-4 flex items-center px-6 py-2 bg-foreground text-background rounded-xl hover:opacity-90 transition-all duration-200 text-sm font-bold shadow-sm active:scale-95"
                                disabled={copied}
                            >
                                {copied ? (
                                    <>
                                        <span className="w-4 h-4 mr-2">âœ“</span>
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <MdContentCopy className="w-4 h-4 mr-2" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="bg-muted rounded-lg p-4 border border-border">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-muted-foreground mb-1">Referral Link</p>
                                <p className="text-sm font-mono text-muted-foreground truncate">
                                    {referralLink}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center px-4 py-2 bg-background text-foreground border border-border rounded-xl hover:bg-muted transition-all duration-200 text-sm font-bold"
                                    disabled={copied}
                                >
                                    <MdContentCopy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleNativeShare}
                                    className="flex items-center px-4 py-2 bg-success text-success-foreground rounded-xl hover:bg-success/90 transition-all duration-200 text-sm font-bold shadow-sm"
                                    disabled={isSharing}
                                >
                                    <MdShare className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <p className="text-lg font-medium text-foreground">
                            Copy and share it with your friends now!
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleSocialShare("messages")}
                                className="w-12 h-12 bg-foreground/10 hover:bg-foreground/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                                title="Share via Messages"
                            >
                                <MdMessage className="w-6 h-6 text-foreground" />
                            </button>
                            <button
                                onClick={() => handleSocialShare("instagram")}
                                className="w-12 h-12 bg-pink-500/10 hover:bg-pink-500/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                                title="Share on Instagram"
                            >
                                <FaInstagram className="w-6 h-6 text-pink-600" />
                            </button>
                            <button
                                onClick={() => handleSocialShare("whatsapp")}
                                className="w-12 h-12 bg-success/10 hover:bg-success/20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                                title="Share on WhatsApp"
                            >
                                <FaWhatsapp className="w-6 h-6 text-success" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-border"></div>

            <div className="bg-info/5 rounded-2xl p-8 border border-info/20">
                <Heading title="Promote and Earn ðŸŽ‰" variant="h4" className="mb-4" />
                <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-2xl">
                    If you're an influencer or content creator with a following, you can promote ContCave
                    while shooting at our properties and earn benefits/discounts.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                        <Heading title="How It Works" variant="h5" className="mb-4" />
                        <ol className="space-y-3 text-muted-foreground">
                            <li className="flex items-start">
                                <span className="bg-info text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0 shadow-sm">1</span>
                                <span className="text-sm font-medium">Shoot content at one of our featured properties and tag us in your posts or videos.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="bg-info text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0 shadow-sm">2</span>
                                <span className="text-sm font-medium">Share your content with your audience and mention your experience with us.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="bg-info text-background rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 shrink-0 shadow-sm">3</span>
                                <span className="text-sm font-medium">Contact us with links to your posts or videos to claim your rewards!</span>
                            </li>
                        </ol>
                    </div>

                    <div className="bg-background rounded-2xl p-6 border border-border shadow-sm">
                        <Heading title="Benefits for Influencers" variant="h5" className="mb-4" />
                        <ul className="list-disc marker:text-success pl-5 space-y-3 text-sm text-muted-foreground leading-6 font-medium">
                            <li>Exclusive discounts on future bookings.</li>
                            <li>Featured promotion on our platform and social media channels.</li>
                            <li>Potential collaboration opportunities.</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-info/20 flex items-center justify-between flex-wrap gap-4">
                    <p className="text-lg font-bold text-foreground">
                        Follow and Tag Us Now!
                    </p>
                    <div className="flex items-center gap-3">
                        <a
                            href="https://instagram.com/contcave"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 bg-foreground text-background hover:opacity-90 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-110 shadow-lg"
                            title="Follow us on Instagram"
                        >
                            <FaInstagram className="w-6 h-6" />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareAndRefer;

