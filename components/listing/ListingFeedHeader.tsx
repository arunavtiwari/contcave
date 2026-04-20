"use client";

import { LocateFixed, MapPin, X } from "lucide-react";
import React from "react";

import AutoComplete from "@/components/inputs/AutoComplete";
import Button from "@/components/ui/Button";
import { useLocationSearch } from "@/hooks/useLocationSearch";
import { useLocationSort } from "@/hooks/useLocationSort";

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
                {!showSortOptions ? (
                    <>
                        <p className="text-xl font-bold tracking-tight text-foreground">
                            {sortedByLocation ? "Spaces near location" : "Showing all spaces"}
                        </p>
                        <Button
                            onClick={() => setShowSortOptions(true)}
                            variant="outline"
                            fit
                            icon={MapPin}
                            label="Sort by distance"
                        />
                    </>
                ) : (
                    <div className="flex-1 flex items-center gap-3 bg-neutral-50 p-1.5 rounded-2xl border border-neutral-100 animate-in slide-in-from-right duration-300">
                        <Button
                            onClick={handleDetectLocation}
                            loading={isLocating}
                            variant="default"
                            rounded
                            fit
                            icon={LocateFixed}
                            label={isLocating ? "Locating..." : "Detect my location"}
                        />
                        <div className="hidden md:block text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">or</div>
                        <div className="flex-1 min-w-0">
                            <AutoComplete
                                onChange={handleManualLocation}
                                placeholder="Search location..."
                            />
                        </div>
                        <button
                            onClick={() => setShowSortOptions(false)}
                            className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors text-muted-foreground"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ListingFeedHeader;
