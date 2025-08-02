"use client";
import React from "react";
import Heading from '@/components/Heading'
import Link from "next/link";

type Props = {};

const ProfileSettings = ({ profile }) => {
    return (
        <div className="flex flex-col w-full gap-5">
            <Heading title="Settings" subtitle="Manage your account settings." />
            <div className="flex flex-col gap-5 sm:gap-8">
                <div className="pl-4">
                    <ul className="list-decimal flex flex-col gap-5">
                        <li>
                            <div className="text-lg font-bold text-slate-950">Support</div>
                            <ul className="list-disc pl-4">
                                <li>Access help resources, FAQs, or contact customer support.</li>
                                <li>Help Center</li>
                                <li>Contact Support</li>
                            </ul>
                        </li>
                        <li>
                            <div className="text-lg font-bold text-slate-950">Legal & Compliance</div>
                            <ul className="list-disc pl-4">
                                <li>Links to terms of service, privacy policy, and other legal documents</li>
                                <li> <Link href="/terms-and-conditions">Terms of Service</Link></li>
                                <li><Link href="/privacy-policy">Privacy Policy</Link></li>
                            </ul>
                        </li>
                        <li>
                            <div className="text-lg font-bold text-slate-950">Feedback & Surveys</div>
                            <ul className="list-disc pl-4">
                                <li>Provide feedback or participate in surveys to improve the platform.</li>
                                <li>Submit Feedback</li>
                                <li>Take Survey</li>
                            </ul>
                        </li>
                    </ul>
                </div>
                <div className="bg-neutral-100 p-5 rounded-xl">
                    <h2 className="text-lg font-bold mb-2">Danger Zone</h2>
                    <p className="text-red-700 text-base font-bold text-red">Delete Account</p>
                    <p className="text-slate-600 font-medium text-sm"><span className="italic">Warning:</span> Deleting your account will permanently remove all your data and cannot be undone. </p>
                    <button className='border-2 border-red px-10 py-1.5 rounded-full hover:opacity-85 text-red shadow-sm mt-3 text-sm font-semibold'>
                        DELETE
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
