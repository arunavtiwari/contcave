"use client";

import { Amenities } from "@prisma/client";
import React from "react";
import { IoMdClose } from "react-icons/io";
import { TbVideoPlus } from "react-icons/tb";

import AddonsSelection from "@/components/inputs/AddonsSelection";
import AmenitiesCheckbox from "@/components/inputs/AmenitySelection";
import AutoComplete, { AutoCompleteValue } from "@/components/inputs/AutoComplete";
import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import FormField from "@/components/inputs/FormField";
import ImageReorderGrid from "@/components/inputs/ImageReorderGrid";
import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/inputs/Input";
import PackagesForm from "@/components/inputs/PackagesForm";
import RichTextEditor from "@/components/inputs/RichTextEditor";
import SetsEditor from "@/components/inputs/SetsEditor";
import Switch from "@/components/inputs/Switch";
import CustomAddonModal from "@/components/modals/CustomAddonModal";
import Button from "@/components/ui/Button";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import Select, { SelectOption } from "@/components/ui/Select";
import { spaceTypes } from "@/constants/spaceTypes";
import { TIME_SLOTS } from "@/constants/timeSlots";
import { slugify } from "@/lib/strings";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";
import { Package as ListingPackage } from "@/types/package";

interface EditPropertyTabProps {
  initialListing: FullListing;
  handleInputChange: (field: string, value: unknown) => void;
  categoryOptionsPrepared: SelectOption[];
  handleAmenitiesChange: (v: { predefined: { [key: string]: boolean }; custom: string[] }) => void;
  amenities: Amenities[];
  addons: Addon[];
  setAddons: (addons: Addon[]) => void;
  handleAddonChange: (v: Addon[]) => void;
  handlePackagesChange: (v: ListingPackage[]) => void;
  removeMedia: (idx: number) => void;
  setsHaveSamePrice: boolean | null;
  setSetsHaveSamePrice: (v: boolean | null) => void;
  unifiedSetPrice: number | null;
  setUnifiedSetPrice: (v: number | null) => void;
  update: () => void;
  isUpdating: boolean;
}

const EditPropertyTab: React.FC<EditPropertyTabProps> = ({
  initialListing,
  handleInputChange,
  categoryOptionsPrepared,
  handleAmenitiesChange,
  amenities,
  addons,
  setAddons,
  handleAddonChange,
  handlePackagesChange,
  removeMedia,
  setsHaveSamePrice,
  setSetsHaveSamePrice,
  unifiedSetPrice,
  setUnifiedSetPrice,
  update,
  isUpdating,
}) => {
  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <Heading title="Edit Property" />
      <Input
        id="listingName"
        label="Name"
        variant="horizontal"
        placeholder="Enter the listing name"
        value={initialListing.title ?? ""}
        onChange={(e) => handleInputChange("title", e.target.value)}
      />

      <Input
        id="listingSlug"
        label="URL Slug"
        variant="horizontal"
        placeholder="Enter custom URL slug"
        value={initialListing.slug ?? ""}
        onChange={(e) => handleInputChange("slug", slugify(e.target.value))}
        customLeftContent="contcave.com/listing/"
      />

      <RichTextEditor
        label="Description"
        variant="horizontal"
        value={initialListing.description || ""}
        onChange={(html) => handleInputChange("description", html)}
      />

      <RichTextEditor
        label="Terms & Conditions by Host"
        variant="horizontal"
        value={initialListing.customTerms ?? ""}
        onChange={(html) => handleInputChange("customTerms", html)}
      />

      <Select
        label="Category"
        variant="horizontal"
        options={categoryOptionsPrepared}
        value={categoryOptionsPrepared.find((item) => item.label === initialListing.category) || null}
        onChange={(sel) => {
          const selected = sel as SelectOption | null;
          handleInputChange("category", selected?.value || "");
        }}
        placeholder="Select Category"
      />

      <FormField label="Listed Services" description="Select all services available in this space" variant="horizontal" align="start">
        <div className="w-full flex flex-wrap gap-2">
          {Array.from(new Set([...spaceTypes, ...(initialListing.type || [])])).map((t) => (
            <Pill
              key={t}
              label={t}
              onClick={() => {
                const currentType = initialListing.type || [];
                const exists = currentType.includes(t);
                const newType = exists ? currentType.filter((x) => x !== t) : [...currentType, t];
                handleInputChange("type", newType);
              }}
              variant={(initialListing.type || []).includes(t) ? "solid" : "secondary"}
            />
          ))}
        </div>
      </FormField>

      <Input
        id="listingPrice"
        label="Price"
        variant="horizontal"
        type="number"
        formatPrice
        placeholder="Price"
        value={Number.isFinite(initialListing.price) ? initialListing.price : ""}
        onNumberChange={(val) => handleInputChange("price", val)}
      />

      <CitySelect
        label="City"
        variant="horizontal"
        value={initialListing.actualLocation as CitySelectValue | undefined}
        locationValue={initialListing.locationValue}
        onChange={(v: CitySelectValue) => {
          handleInputChange("actualLocation", {
            ...(initialListing.actualLocation || {}),
            ...v,
          });
          handleInputChange("locationValue", v.value || "");
        }}
      />

      <AutoComplete
        label="Detailed address"
        variant="horizontal"
        value={initialListing.actualLocation?.display_name || ""}
        onChange={(sel: AutoCompleteValue) => {
          handleInputChange("actualLocation", {
            ...(initialListing.actualLocation || {}),
            display_name: sel.display_name,
            latlng: sel.latlng,
            address: sel.display_name,
            lat: sel.latlng[0],
            lng: sel.latlng[1],
          });
        }}
        placeholder="Search for space address..."
      />

      <FormField label="Images" description="(Max 30)" variant="horizontal" align="start">
        <div className="w-full">
          <ImageReorderGrid
            images={initialListing.imageSrc ?? []}
            onReorder={(newOrder) => handleInputChange("imageSrc", newOrder)}
            onRemove={removeMedia}
          />
          <div className="mt-4">
            {(initialListing.imageSrc?.length ?? 0) < 30 && (
              <div className="h-32 w-32 inline-block">
                <ImageUpload
                  uid="property-main-upload"
                  onChange={(value) => handleInputChange("imageSrc", value)}
                  values={initialListing.imageSrc ?? []}
                  deferUpload
                />
              </div>
            )}
          </div>
        </div>
      </FormField>

      <FormField label="Video tour (Optional)" variant="horizontal" align="start">
        <div className="w-full">
          <ImageUpload
            uid="property-video-upload"
            uploadLabel="Upload Video Tour"
            onChange={(v) => handleInputChange("videoSrc", v[0] || null)}
            values={initialListing.videoSrc ? [initialListing.videoSrc] : []}
            allowedTypes={["video/mp4", "video/webm", "video/quicktime"]}
            maxSize={100 * 1024 * 1024}
            icon={TbVideoPlus}
            className="w-full h-48 p-4 border border-border rounded-xl"
          />
          {initialListing.videoSrc && (
            <div className="mt-4 relative group w-full max-w-md">
              <video src={initialListing.videoSrc} controls className="w-full h-48 rounded-xl object-cover border border-border" />
              <button
                onClick={() => handleInputChange("videoSrc", null)}
                className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
              >
                <IoMdClose size={18} />
              </button>
            </div>
          )}
        </div>
      </FormField>

      <AmenitiesCheckbox
        label="Amenities"
        variant="horizontal"
        checked={Array.isArray(initialListing.amenities) ? initialListing.amenities : []}
        amenities={amenities}
        onChange={handleAmenitiesChange}
        customAmenities={initialListing.otherAmenities}
      />

      <AddonsSelection
        label="Addons"
        variant="horizontal"
        initialSelectedAddons={initialListing.addons}
        addons={addons}
        onSelectedAddonsChange={handleAddonChange}
      />
      <div className="flex justify-end -mt-8">
        <CustomAddonModal
          save={(value) => {
            const updated = [...addons, { ...value, price: 0, qty: 0, imageUrl: value.imageUrl ?? "" }];
            setAddons(updated);
          }}
        />
      </div>

      <PackagesForm
        label="Packages"
        variant="horizontal"
        value={initialListing.packages ?? []}
        onChange={handlePackagesChange}
        availableSets={initialListing.hasSets ? (initialListing.sets ?? []) : []}
      />

      <Input
        id="carpetArea"
        label="Carpet Area (sq ft)"
        variant="horizontal"
        type="number"
        placeholder="Enter the carpet area"
        value={initialListing.carpetArea ?? 0}
        onNumberChange={(val) => handleInputChange("carpetArea", val)}
      />

      <FormField label="Operational Days" variant="horizontal">
        <div className="flex items-center gap-3 w-full">
          <Select
            className="w-full"
            options={dayOptionsPrepared}
            value={dayOptionsPrepared.find((d) => d.value === initialListing.operationalDays?.start)}
            onChange={(sel) => handleInputChange("operationalDays.start", (sel as SelectOption).value)}
            placeholder="Start Day"
          />
          <div className={propertyFieldSeparatorClassName}>to</div>
          <Select
            className="w-full"
            options={dayOptionsPrepared}
            value={dayOptionsPrepared.find((d) => d.value === initialListing.operationalDays?.end)}
            onChange={(sel) => handleInputChange("operationalDays.end", (sel as SelectOption).value)}
            placeholder="End Day"
          />
        </div>
      </FormField>

      <FormField label="Operational Hours" variant="horizontal">
        <div className="flex items-center gap-3 w-full">
          <Select
            className="w-full"
            options={timeOptionsPrepared}
            value={timeOptionsPrepared.find((t) => t.value === initialListing.operationalHours?.start)}
            onChange={(sel) => handleInputChange("operationalHours.start", (sel as SelectOption).value)}
            placeholder="Start Time"
          />
          <div className={propertyFieldSeparatorClassName}>to</div>
          <Select
            className="w-full"
            options={timeOptionsPrepared}
            value={timeOptionsPrepared.find((t) => t.value === initialListing.operationalHours?.end)}
            onChange={(sel) => handleInputChange("operationalHours.end", (sel as SelectOption).value)}
            placeholder="End Time"
          />
        </div>
      </FormField>

      <Input
        id="minimumBookingHours"
        label="Min Booking Hours"
        variant="horizontal"
        type="number"
        placeholder="e.g. 2"
        value={initialListing.minimumBookingHours ?? 0}
        onNumberChange={(val) => handleInputChange("minimumBookingHours", val)}
      />

      <Input
        id="maximumPax"
        label="Max People"
        variant="horizontal"
        type="number"
        placeholder="e.g. 10"
        value={initialListing.maximumPax ?? 0}
        onNumberChange={(val) => handleInputChange("maximumPax", val)}
      />

      <Switch
        label="Instant Booking"
        variant="horizontal"
        checked={Boolean(initialListing.instantBooking)}
        onChange={(checked) => handleInputChange("instantBooking", checked)}
      />

      <div className="border-t border-border/40 pt-8 mt-4 flex flex-col gap-6">
        <Heading title="Sets Management" subtitle="Manage your bookable sets and pricing" variant="h5" />
        <FormField label="Enable Sets" variant="horizontal">
          <div className="w-full flex items-center">
            <Switch
              checked={Boolean(initialListing.hasSets)}
              onChange={(checked) => handleInputChange("hasSets", checked)}
            />
          </div>
        </FormField>

        {initialListing.hasSets && (
          <div className="flex flex-col gap-6 pl-4">
            <FormField label="Pricing Type" variant="horizontal">
              <div className="flex gap-4 w-full">
                <Button
                  onClick={() => handleInputChange("additionalSetPricingType", "FIXED")}
                  variant={initialListing.additionalSetPricingType === "FIXED" ? "default" : "outline"}
                  label="Fixed Add-on"
                  fit
                  className="flex-1"
                />
                <Button
                  onClick={() => handleInputChange("additionalSetPricingType", "HOURLY")}
                  variant={initialListing.additionalSetPricingType === "HOURLY" ? "default" : "outline"}
                  label="Hourly Add-on"
                  fit
                  className="flex-1"
                />
              </div>
            </FormField>

            <FormField label="Will all sets have the same price?" variant="horizontal">
              <div className="flex gap-4 w-full">
                <label
                  className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${
                    setsHaveSamePrice === true
                      ? "border-foreground bg-muted ring-1 ring-foreground/10"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="priceConsistency"
                    checked={setsHaveSamePrice === true}
                    onChange={() => setSetsHaveSamePrice(true)}
                    className="hidden"
                  />
                  <div className="font-medium text-center">Yes, same price</div>
                </label>
                <label
                  className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${
                    setsHaveSamePrice === false
                      ? "border-foreground bg-muted ring-1 ring-foreground/10"
                      : "border-border hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="priceConsistency"
                    checked={setsHaveSamePrice === false}
                    onChange={() => setSetsHaveSamePrice(false)}
                    className="hidden"
                  />
                  <div className="font-medium text-center">No, different prices</div>
                </label>
              </div>
            </FormField>

            <SetsEditor
              label="Manage Sets"
              variant="horizontal"
              sets={initialListing.sets ?? []}
              onChange={(updated) => handleInputChange("sets", updated)}
              pricingType={initialListing.additionalSetPricingType || null}
              isPricingUniform={setsHaveSamePrice ?? undefined}
              uniformPrice={unifiedSetPrice}
              onUniformPriceChange={setUnifiedSetPrice}
            />
          </div>
        )}
      </div>

      <div className="col-span-3 pt-5 flex justify-end">
        <Button label={isUpdating ? "Saving..." : "Save"} onClick={update} fit className="px-8" disabled={isUpdating} />
      </div>
    </div>
  );
};

const dayOptions = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const dayOptionsPrepared: SelectOption[] = dayOptions.map((d) => ({ value: d, label: d }));
const timeOptionsPrepared: SelectOption[] = TIME_SLOTS.map((t) => ({ value: t, label: t }));
const propertyFieldSeparatorClassName = "flex items-center justify-center self-stretch px-1 text-sm font-medium leading-none text-muted-foreground";

export default EditPropertyTab;
