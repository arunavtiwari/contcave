"use client";
import React, { useCallback, useState } from "react";
import {
    FaInstagram,
    FaWhatsapp
} from "react-icons/fa";
import {
    MdContentCopy,
    MdMessage,
    MdQuestionMark,
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
                title="Share with Friends and Earn Rewards 🙌"
                subtitle="Refer your friends to ContCave and both of you can earn rewards"
            />

            <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
                    <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-2">
                        <MdQuestionMark />
                    </span>
                    How It Works
                </h3>
                <ol className="space-y-3 text-slate-700">
                    <li className="flex items-start">
                        <span className="bg-blue-500 text-background rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 shrink-0">1</span>
                        <span>Share your unique referral link or code with friends.</span>
                    </li>
                    <li className="flex items-start">
                        <span className="bg-blue-500 text-background rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 shrink-0">2</span>
                        <span>When someone signs up and books their first space using your referral link or code, you both earn rewards!</span>
                    </li>
                </ol>
            </div>

            <div className="bg-background rounded-xl border border-gray-200 p-6 ">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Referral Link</h3>

                <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600 mb-1">Referral Code</p>
                                <p className="text-lg font-mono font-semibold text-slate-900 truncate">
                                    {referralCode}
                                </p>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="ml-4 flex items-center px-3 py-2 bg-blue-600 text-background rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                                disabled={copied}
                            >
                                {copied ? (
                                    <>
                                        <span className="w-4 h-4 mr-2">✓</span>
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

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-600 mb-1">Referral Link</p>
                                <p className="text-sm font-mono text-slate-700 truncate">
                                    {referralLink}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                                    disabled={copied}
                                >
                                    <MdContentCopy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleNativeShare}
                                    className="flex items-center px-3 py-2 bg-green-600 text-background rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium"
                                    disabled={isSharing}
                                >
                                    <MdShare className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <p className="text-lg font-medium text-slate-900">
                            Copy and share it with your friends now!
                        </p>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleSocialShare("messages")}
                                className="w-10 h-10 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors duration-200"
                                title="Share via Messages"
                            >
                                <MdMessage className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                                onClick={() => handleSocialShare("instagram")}
                                className="w-10 h-10 bg-pink-100 hover:bg-pink-200 rounded-full flex items-center justify-center transition-colors duration-200"
                                title="Share on Instagram"
                            >
                                <FaInstagram className="w-5 h-5 text-pink-600" />
                            </button>
                            <button
                                onClick={() => handleSocialShare("whatsapp")}
                                className="w-10 h-10 bg-green-100 hover:bg-green-200 rounded-full flex items-center justify-center transition-colors duration-200"
                                title="Share on WhatsApp"
                            >
                                <FaWhatsapp className="w-5 h-5 text-green-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-200"></div>

            <div className="bg-linear-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
                    <span className="mr-2">🎉</span>
                    Promote and Earn
                </h2>
                <p className="text-base text-slate-700 leading-relaxed mb-6">
                    If you're an influencer or content creator with a following, you can promote ContCave
                    while shooting at our properties and earn benefits/discounts.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-background rounded-lg p-5 border border-gray-200">
                        <h3 className="text-lg font-semibold text-slate-900 mb-3">How It Works</h3>
                        <ol className="space-y-2 text-slate-700">
                            <li className="flex items-start">
                                <span className="bg-purple-500 text-background rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">1</span>
                                <span className="text-sm">Shoot content at one of our featured properties and tag us in your posts or videos.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="bg-purple-500 text-background rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">2</span>
                                <span className="text-sm">Share your content with your audience and mention your experience with us.</span>
                            </li>
                            <li className="flex items-start">
                                <span className="bg-purple-500 text-background rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 shrink-0">3</span>
                                <span className="text-sm">Contact us with links to your posts or videos to claim your rewards!</span>
                            </li>
                        </ol>
                    </div>

                    <div className="bg-background rounded-lg p-5 border border-gray-200">
                        <h3 className="text-lg font-semibold text-slate-900 mb-3">Benefits for Influencers</h3>
                        <ul className="list-disc marker:text-emerald-500 pl-5 space-y-2 text-sm text-slate-700 leading-6">
                            <li>Exclusive discounts on future bookings.</li>
                            <li>Featured promotion on our platform and social media channels.</li>
                            <li>Potential collaboration opportunities.</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-purple-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <p className="text-lg font-medium text-slate-900">
                            Follow and Tag Us Now!
                        </p>
                        <div className="flex items-center gap-3">
                            <a
                                href="https://instagram.com/contcave"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 bg-linear-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center transition-all duration-200 transform hover:scale-105"
                                title="Follow us on Instagram"
                            >
                                <FaInstagram className="w-5 h-5 text-background" />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareAndRefer;
