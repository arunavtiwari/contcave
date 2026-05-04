"use client";

import { Amenities } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteListingAction } from "@/app/actions/listingActions";
import DeletePropertyModal from "@/components/modals/DeletePropertyModal";
import { categories as CATEGORY_OPTIONS } from "@/components/navbar/Categories";
import { SelectOption } from "@/components/ui/Select";
import { MAIN_SIDEBAR_ITEMS } from "@/constants/navigation";
import { usePropertyEdit } from "@/hooks/usePropertyEdit";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";

import EditPropertyTab from "./property/EditPropertyTab";
import ManageBlocksTab from "./property/ManageBlocksTab";
import ManageTimingsTab from "./property/ManageTimingsTab";
import SettingsTab from "./property/SettingsTab";
import SyncCalendarTab from "./property/SyncCalendarTab";

type Props = {
    listing: FullListing;
    predefinedAmenities: Amenities[];
    predefinedAddons: Addon[];
};

const CATEGORY_OPTIONS_PREPARED: SelectOption[] = CATEGORY_OPTIONS.map((c) => ({ ...c, value: c.label }));

const PropertyClient = ({ listing, predefinedAmenities, predefinedAddons }: Props) => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const selectedMenu = searchParams?.get("tab") || "Edit Property";
    
    const {
        initialListing,
        addons,
        setAddons,
        setsHaveSamePrice,
        setSetsHaveSamePrice,
        unifiedSetPrice,
        setUnifiedSetPrice,
        isUpdating,
        handleInputChange,
        handleAmenitiesChange,
        handleAddonChange,
        handlePackagesChange,
        removeMedia,
        update,
    } = usePropertyEdit(listing, predefinedAddons);

    const [isCalendarConnected, setIsCalendarConnected] = useState(listing.user?.googleCalendarConnected);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        window.scrollTo({ top: 0 });
    }, [selectedMenu]);

    const handleDeleteProperty = useCallback(async () => {
        setIsDeleting(true);
        try {
            const res = await deleteListingAction(initialListing.id);
            if (res.error) throw new Error(res.error);
            toast.info("Property deleted successfully", { id: "Listing_Deleted" });
            router.push("/dashboard/properties");
            router.refresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to delete property";
            toast.error(message, { id: "Property_Delete_Error_1" });
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    }, [initialListing.id, router]);

    const renderContent = () => {
        switch (selectedMenu) {
            case "Edit Property":
                return (
                    <EditPropertyTab
                        initialListing={initialListing}
                        handleInputChange={handleInputChange}
                        categoryOptionsPrepared={CATEGORY_OPTIONS_PREPARED}
                        handleAmenitiesChange={handleAmenitiesChange}
                        amenities={predefinedAmenities}
                        addons={addons}
                        setAddons={setAddons}
                        handleAddonChange={handleAddonChange}
                        handlePackagesChange={handlePackagesChange}
                        removeMedia={removeMedia}
                        setsHaveSamePrice={setsHaveSamePrice}
                        setSetsHaveSamePrice={setSetsHaveSamePrice}
                        unifiedSetPrice={unifiedSetPrice}
                        setUnifiedSetPrice={setUnifiedSetPrice}
                        update={update}
                        isUpdating={isUpdating}
                    />
                );
            case "Sync Calendar":
                return (
                    <SyncCalendarTab
                        isCalendarConnected={!!isCalendarConnected}
                        setIsCalendarConnected={setIsCalendarConnected}
                        operationalDays={initialListing.operationalDays ?? {}}
                        listingId={initialListing.id}
                    />
                );
            case "Manage Timings":
                return (
                    <ManageTimingsTab
                        listingId={initialListing.id}
                        operationalHours={initialListing.operationalHours ?? {}}
                        operationalDays={initialListing.operationalDays ?? {}}
                    />
                );
            case "Manage Blocks":
                return (
                    <ManageBlocksTab
                        listingId={initialListing.id}
                        sets={initialListing.sets ?? []}
                    />
                );
            case "Settings":
                return <SettingsTab setIsDeleteModalOpen={setIsDeleteModalOpen} />;
            default:
                return null;
        }
    };

    return (
        <SessionProvider>
            <div className="flex flex-col w-full gap-5">
                <div className="flex w-full overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-border/40">
                    {MAIN_SIDEBAR_ITEMS.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => router.push(`?tab=${encodeURIComponent(item.name)}`, { scroll: false })}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${
                                selectedMenu === item.name
                                    ? "bg-foreground text-background"
                                    : "text-muted-foreground hover:bg-muted"
                            }`}
                        >
                            {item.icon}
                            {item.name}
                        </button>
                    ))}
                </div>

                <div className="mt-4">
                    {renderContent()}
                </div>

                <DeletePropertyModal
                    isOpen={isDeleteModalOpen}
                    onCloseAction={() => setIsDeleteModalOpen(false)}
                    onConfirmAction={handleDeleteProperty}
                    propertyName={initialListing.title || ""}
                    isLoading={isDeleting}
                />
            </div>
        </SessionProvider>
    );
};

export default PropertyClient;
