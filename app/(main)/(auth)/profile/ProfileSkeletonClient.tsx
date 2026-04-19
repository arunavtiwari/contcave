"use client";

import { useSearchParams } from "next/navigation";
import React from "react";

import Skeleton from "@/components/ui/Skeleton";

export default function ProfileSkeletonClient() {
    const searchParams = useSearchParams();
    const tab = searchParams?.get("tab") || "profile";

    const renderSkeleton = () => {
        switch (tab) {
            case "settings":
                return <SettingsSkeleton />;
            case "share-refer":
                return <ShareReferSkeleton />;
            case "manage-payments":
                return <PaymentsSkeleton />;
            default:
                return <MyProfileSkeleton />;
        }
    };

    return (
        <div className="flex flex-col w-full gap-5">
            {renderSkeleton()}
        </div>
    );
}

const MyProfileSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-6 w-96 max-w-full" />
            </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                <div className="bg-background rounded-2xl border border-border overflow-hidden">
                    <div className="h-24 w-full bg-neutral-100 relative">
                        <div className="absolute -bottom-12 left-8">
                            <Skeleton className="w-24 h-24 rounded-full! border-4 border-background bg-neutral-200" />
                        </div>
                    </div>
                    <div className="pt-14 py-6 px-8">
                        <div className="flex justify-between mb-6 gap-8 items-center">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </div>
                </div>

                <div className="bg-background rounded-2xl border border-border p-8">
                    <Skeleton className="h-6 w-40 mb-8" />
                    <div className="flex flex-col gap-6">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center sm:gap-0 gap-4">
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-5 w-5 rounded-md" />
                                    <Skeleton className="h-5 w-24" />
                                </div>
                                <Skeleton className="h-5 w-40 max-w-[50%]" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-neutral-50/50 border border-neutral-100 rounded-2xl p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                        <Skeleton className="w-16 h-16 rounded-full! " />
                        <div className="flex flex-col items-center gap-2 w-full">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                        <Skeleton className="h-11 w-full rounded-xl mt-4" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const SettingsSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-6 w-64" />
        </div>

        <div className="flex flex-col gap-5">
            <div className="pl-4">
                <div className="flex flex-col gap-5 border-l border-border/50 pl-6 ml-1">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-4 relative">
                            <div className="absolute -left-7.75 top-1 w-2 h-2 rounded-full bg-border" />
                            <Skeleton className="h-7 w-32" />
                            <div className="pl-4 space-y-3">
                                <Skeleton className="h-5 w-full max-w-md" />
                                <Skeleton className="h-5 w-2/3" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-destructive/5 p-6 rounded-2xl border border-destructive/20">
                <Skeleton className="h-7 w-32 mb-4" />
                <Skeleton className="h-6 w-24 mb-1" />
                <Skeleton className="h-5 w-full max-w-lg mb-6" />
                <Skeleton className="h-11 w-32 rounded-xl" />
            </div>
        </div>
    </div>
);

const ShareReferSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-3/4 max-w-md" />
            <Skeleton className="h-6 w-full max-w-lg" />
        </div>

        <div className="bg-muted/30 rounded-2xl p-6 border border-foreground/20">
            <Skeleton className="h-7 w-40 mb-6" />
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex items-start gap-3">
                        <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                        <Skeleton className="h-6 w-full max-w-md" />
                    </div>
                ))}
            </div>
        </div>

        <div className="bg-background rounded-xl border border-border p-6 space-y-6">
            <Skeleton className="h-7 w-48" />
            <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-muted/30 p-4 rounded-lg border border-border">
                        <div className="flex justify-between items-center">
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-7 w-3/4" />
                            </div>
                            <Skeleton className="h-10 w-24 rounded-lg ml-4" />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-border flex justify-between items-center sm:flex-row flex-col gap-4">
                <Skeleton className="h-7 w-64" />
                <div className="flex gap-3">
                    {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="w-12 h-12 rounded-full" />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const PaymentsSkeleton = () => (
    <div className="flex flex-col w-full gap-5">
        <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        <nav className="relative inline-flex bg-muted rounded-full p-1 w-fit self-center border border-border gap-1">
            <Skeleton className="h-11 w-48 rounded-full!" />
            <Skeleton className="h-11 w-40 rounded-full" />
        </nav>

        <div className="space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-5 w-48" />
                </div>
                <Skeleton className="h-11 w-24 rounded-xl" />
            </div>

            <div className="space-y-4 rounded-xl border border-border p-6">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)] md:items-center">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-2 mt-4">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-5 w-48" />
            </div>

            <div className="space-y-4 rounded-xl border border-border p-6">
                {[...Array(2)].map((_, i) => (
                    <div key={i} className="grid gap-2 md:grid-cols-[280px_minmax(0,1fr)] md:items-center">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);
