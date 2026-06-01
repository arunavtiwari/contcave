"use client";

import { AnimatePresence, motion } from "framer-motion";
import React from "react";
import { IoClose, IoLocateOutline, IoLocationOutline } from "react-icons/io5";

import AutoComplete from "@/components/inputs/AutoComplete";
import Button from "@/components/ui/Button";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { useLocationSort } from "@/hooks/useLocationSort";
import { cn } from "@/lib/utils";

const ListingFeedHeader: React.FC = () => {
    const {
        sortedByLocation,
        showSortOptions,
        setShowSortOptions,
        isLocating
    } = useLocationSort();

    const { handleDetectLocation, handleManualLocation } = useLocationSearch();

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between gap-4 h-14">
                <p className={cn(
                    "text-xl font-bold tracking-tight text-foreground shrink-0",
                    showSortOptions ? "hidden md:block" : "block"
                )}>
                    {sortedByLocation ? "Spaces near location" : "Showing all spaces"}
                </p>

                <AnimatePresence mode="wait">
                    {!showSortOptions ? (
                        <motion.div
                            key="button"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Button
                                onClick={() => setShowSortOptions(true)}
                                variant="outline"
                                fit
                                icon={IoLocationOutline}
                                label="Sort by distance"
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="options"
                            initial={{ opacity: 0, scale: 0.98, x: 15 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.98, x: 15 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="flex-1 md:flex-initial md:w-[580px] flex items-center gap-2 sm:gap-3 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100 overflow-hidden"
                        >
                            <Button
                                onClick={handleDetectLocation}
                                loading={isLocating}
                                variant="default"
                                fit
                                icon={IoLocateOutline}
                                className="w-10 sm:w-auto p-0 sm:px-4 aspect-square sm:aspect-auto"
                            >
                                <span className="hidden sm:inline">
                                    {isLocating ? "Locating..." : "Detect my location"}
                                </span>
                            </Button>
                            <div className="hidden md:block text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">or</div>
                            <div className="flex-1 min-w-0">
                                <AutoComplete
                                    onChange={handleManualLocation}
                                    placeholder="Search location..."
                                />
                            </div>
                            <button
                                onClick={() => setShowSortOptions(false)}
                                className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors text-muted-foreground shrink-0"
                            >
                                <IoClose size={20} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ListingFeedHeader;
