"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Amenities } from "@prisma/client";
import dynamic from "next/dynamic";
import Image from "next/image";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FieldPath, FieldValues, Resolver, SubmitHandler, useForm } from "react-hook-form";
import { IoMdClose } from "react-icons/io";
import { toast } from "sonner";

import getAddons from "@/app/actions/getAddons";
import getAmenities from "@/app/actions/getAmenities";
import { createListingAction, updateListingAction } from "@/app/actions/listingActions";
import AddonsSelection from "@/components/inputs/AddonsSelection";
import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import AutoComplete, { AutoCompleteValue } from "@/components/inputs/AutoComplete";
import CategoryInput from "@/components/inputs/CategoryInput";
import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import ImageUpload from "@/components/inputs/ImageUpload";
import Input from "@/components/inputs/Input";
import OtherListingDetails, { ListingDetails } from "@/components/inputs/OtherListingDetails";
import PackagesForm from "@/components/inputs/PackagesForm";
import LexicalEditor from "@/components/inputs/RichTextEditor"
import SetsEditor, { SetEditorItem } from "@/components/inputs/SetsEditor";
import SpaceVerification, { VerificationDocument, VerificationPayload } from "@/components/inputs/SpaceVerification";
import TermsAndConditionsModal, { SignatureMeta, TermsRef } from "@/components/inputs/TermsAndConditions";
import { categories } from "@/components/navbar/Categories";
import Heading from "@/components/ui/Heading";
import { OPENING_HOURS_MAX_END, OPENING_HOURS_MIN_START, TIME_SLOTS } from "@/constants/timeSlots";
import useUIStore from "@/hooks/useUIStore";
import { isRichTextEmpty } from "@/lib/richText";
import { uploadToR2 } from "@/lib/storage/upload";
import { listingSchema } from "@/schemas/listing";
import { Addon } from "@/types/addon";
import { Package } from "@/types/package";
import { AdditionalSetPricingType } from "@/types/set";

type LocationValue = CitySelectValue & {
  display_name?: string;
  additionalInfo?: string;
};

import CustomAddonModal from "@/components/modals/CustomAddonModal";
import Modal from "@/components/modals/Modal";

enum STEPS {
  CATEGORY = 0,
  LOCATION,
  IMAGES,
  DESCRIPTION,
  AMENITIES,
  ADDONS,
  OTHERDETAILS,
  CUSTOMTERMS,
  SETS,
  PACKAGES,
  VERIFICATION,
  TERMS,
}

const getActiveSteps = (hasSets: boolean) =>
  hasSets
    ? [
      STEPS.CATEGORY,
      STEPS.LOCATION,
      STEPS.IMAGES,
      STEPS.DESCRIPTION,
      STEPS.AMENITIES,
      STEPS.ADDONS,
      STEPS.OTHERDETAILS,
      STEPS.SETS,
      STEPS.CUSTOMTERMS,
      STEPS.PACKAGES,
      STEPS.VERIFICATION,
      STEPS.TERMS,
    ]
    : [
      STEPS.CATEGORY,
      STEPS.LOCATION,
      STEPS.IMAGES,
      STEPS.DESCRIPTION,
      STEPS.AMENITIES,
      STEPS.ADDONS,
      STEPS.OTHERDETAILS,
      STEPS.CUSTOMTERMS,
      STEPS.PACKAGES,
      STEPS.VERIFICATION,
      STEPS.TERMS,
    ];

type RentModalFormValues = FieldValues & {
  category: string;
  locationValue: string;
  actualLocation: LocationValue | null;
  imageSrc: string[];
  videoSrc: string | null;
  title: string;
  description: string;
  price: number;
  amenities: string[];
  otherAmenities: string[];
  addons: Addon[];
  carpetArea: number;
  operationalDays: { start?: string; end?: string };
  operationalHours: { start?: string; end?: string };
  minimumBookingHours: number;
  maximumPax: number;
  instantBooking: boolean;
  type: string[];
  hasSets: boolean;
  setsHaveSamePrice: boolean | null;
  unifiedSetPrice: number | null;
  sets: SetEditorItem[];
  additionalSetPricingType: AdditionalSetPricingType | null;
  packages: Package[];
  verifications: VerificationPayload | null;
  terms: boolean;
  agreementSignature: SignatureMeta | null;
  customTerms: string;
};

type StepDefinition = {
  id: STEPS;
  modalTitle: string;
  actionLabel: string;
  validate?: () => Promise<boolean>;
  render: () => React.ReactNode;
};

export default function RentModal() {
  const uiStore = useUIStore();

  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amenities, setAmenities] = useState<Amenities[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [, setAgreementPdf] = useState<unknown>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [step]);


  const termsRef = useRef<TermsRef>(null);
  const Map = useMemo(() => dynamic(() => import("../Map"), { ssr: false }), []);

  const {
    register,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
    reset,
    trigger,
  } = useForm<RentModalFormValues>({
    resolver: zodResolver(listingSchema) as unknown as Resolver<RentModalFormValues>,
    mode: "onTouched",
    shouldUnregister: false,
    defaultValues: {
      category: "",
      locationValue: "",
      actualLocation: null as LocationValue | null,
      imageSrc: [],
      videoSrc: null,
      title: "",
      description: "",
      price: 0,
      amenities: [],
      otherAmenities: [],
      addons: [],
      type: [],
      instantBooking: false,
      hasSets: false,
      setsHaveSamePrice: false,
      unifiedSetPrice: null,
      sets: [],
      additionalSetPricingType: null,
      packages: [],
      carpetArea: 0,
      operationalDays: { start: "Mon", end: "Sun" },
      operationalHours: { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: 0,
      maximumPax: 0,
      verifications: null,
      terms: false,
      agreementSignature: null,
      customTerms: "",
    },
  });
  const category = watch("category");
  const actualLocation = watch("actualLocation") as LocationValue | null;
  const locationValue = watch("locationValue");
  const imageSrc = watch("imageSrc");
  const videoSrc = watch("videoSrc");
  const descriptionValue = watch("description");
  const selectedAmenityIds = watch("amenities") as string[] | undefined;
  const selectedCustomAmenities = watch("otherAmenities") as string[] | undefined;
  const selectedAddons = watch("addons") as Addon[] | undefined;
  const carpetArea = watch("carpetArea");
  const operationalDays = watch("operationalDays");
  const operationalHours = watch("operationalHours");
  const minimumBookingHours = watch("minimumBookingHours");
  const maximumPax = watch("maximumPax");
  const instantBooking = watch("instantBooking");
  const type = watch("type");
  const hasSets = watch("hasSets");
  const sets = watch("sets") as SetEditorItem[] | undefined;
  const setsHaveSamePrice = watch("setsHaveSamePrice");
  const unifiedSetPrice = watch("unifiedSetPrice");
  const additionalSetPricingType = watch("additionalSetPricingType");
  const packages = watch("packages") as Package[] | undefined;
  const verifications = watch("verifications");
  const terms = watch("terms");
  const signature = watch("agreementSignature");
  const listingDetails = useMemo<ListingDetails>(() => ({
    carpetArea: carpetArea || 0,
    operationalDays: operationalDays || { start: "Mon", end: "Sun" },
    operationalHours: operationalHours || { start: "9:00 AM", end: "9:00 PM" },
    minimumBookingHours: minimumBookingHours || 0,
    maximumPax: maximumPax || 0,
    instantBooking: Boolean(instantBooking),
    type: Array.isArray(type) ? type : [],
    hasSets: Boolean(hasSets),
  }), [carpetArea, operationalDays, operationalHours, minimumBookingHours, maximumPax, instantBooking, type, hasSets]);
  const [categoryError, setCategoryError] = useState<string>("");
  const [cityError, setCityError] = useState<string>("");
  const [addressError, setAddressError] = useState<string>("");
  const [imageError, setImageError] = useState<string>("");
  const [setsError, setSetsError] = useState<string>("");
  const [verificationError, setVerificationError] = useState<string>("");


  useEffect(() => {
    (async () => {
      try {
        const [amenitiesData, addonsData] = await Promise.all([
          getAmenities(),
          getAddons(),
        ]);
        setAmenities(amenitiesData);
        setAddons(addonsData);
      } catch {
        toast.error("Failed to load resources.");
      }
    })();
  }, []);


  useEffect(() => {
    if (actualLocation?.value) {
      setValue("locationValue", actualLocation.value, { shouldValidate: true });
    }
  }, [actualLocation, setValue]);

  const setCustomValue = useCallback(
    (id: FieldPath<RentModalFormValues>, value: unknown) => {
      setValue(id, value as never, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const activeSteps = useMemo(() => getActiveSteps(Boolean(hasSets)), [hasSets]);

  const currentStepIndex = activeSteps.indexOf(step);

  const goToNextStep = useCallback(() => {
    const nextStep = activeSteps[currentStepIndex + 1];
    if (nextStep !== undefined) {
      setStep(nextStep);
    }
  }, [activeSteps, currentStepIndex]);

  const goToPreviousStep = useCallback(() => {
    const previousStep = activeSteps[currentStepIndex - 1];
    if (previousStep !== undefined) {
      setStep(previousStep);
    }
  }, [activeSteps, currentStepIndex]);

  const onBack = () => {
    goToPreviousStep();
  };

  const resetStepErrors = useCallback(() => {
    setCategoryError("");
    setCityError("");
    setAddressError("");
    setImageError("");
    setSetsError("");
    setVerificationError("");
  }, []);

  const validateCategoryStep = useCallback(async () => {
    const valid = await trigger("category");
    if (!valid) {
      setCategoryError("Please select a category");
      return false;
    }
    return true;
  }, [trigger]);

  const validateLocationStep = useCallback(async () => {
    if (!actualLocation || !actualLocation.value) {
      setCityError("Please select a city");
      return false;
    }
    if (!actualLocation.display_name) {
      setAddressError("Please enter a complete address");
      return false;
    }
    if (!actualLocation.latlng || !Array.isArray(actualLocation.latlng) || actualLocation.latlng.length !== 2) {
      setAddressError("Please select a valid location using autocomplete to fetch map coordinates");
      return false;
    }
    return trigger("actualLocation");
  }, [actualLocation, trigger]);

  const validateImagesStep = useCallback(async () => {
    const totalImages = (imageSrc || []).length;

    if (totalImages === 0) {
      setImageError("Please upload at least one image");
      return false;
    }
    if (totalImages > 30) {
      setImageError("Maximum 30 images allowed");
      return false;
    }

    return trigger("imageSrc");
  }, [imageSrc, trigger]);

  const validateDescriptionStep = useCallback(async () => {
    const isValid = await trigger(["title", "description", "price"]);
    if (!isValid) return false;
    const currentPrice = Number(watch("price"));
    if (currentPrice <= 0) {
      toast.error("Price must be greater than 0");
      return false;
    }
    return true;
  }, [trigger, watch]);

  const validateAddonsStep = useCallback(async () => {
    if ((selectedAddons?.length ?? 0) > 0) {
      const invalidAddon = selectedAddons?.find(
        (a) => !a.price || a.price <= 0 || !a.qty || a.qty <= 0
      );
      if (invalidAddon) {
        toast.error(`Please provide a valid price and quantity for ${invalidAddon.name}`);
        return false;
      }
    }
    return true;
  }, [selectedAddons]);

  const validateAmenitiesStep = useCallback(async () => {
    return trigger(["amenities", "otherAmenities"]);
  }, [trigger]);

  const validateOtherDetailsStep = useCallback(async () => {
    if (!listingDetails.carpetArea || listingDetails.carpetArea <= 0) {
      toast.error("Please enter carpet area");
      return false;
    }
    if (!listingDetails.minimumBookingHours || listingDetails.minimumBookingHours <= 0) {
      toast.error("Please enter minimum booking hours");
      return false;
    }
    if (!listingDetails.maximumPax || listingDetails.maximumPax <= 0) {
      toast.error("Please enter maximum pax");
      return false;
    }
    if (!listingDetails.type || listingDetails.type.length === 0) {
      toast.error("Please select at least one space type");
      return false;
    }
    const start = listingDetails.operationalHours?.start?.trim() || "";
    const end = listingDetails.operationalHours?.end?.trim() || "";
    if (!start || !end) {
      toast.error("Please select opening hours");
      return false;
    }
    const startIdx = TIME_SLOTS.indexOf(start);
    const endIdx = TIME_SLOTS.lastIndexOf(end);

    if (startIdx === -1 || endIdx === -1) {
      toast.error(`Opening hours must be between ${OPENING_HOURS_MIN_START} and ${OPENING_HOURS_MAX_END}`);
      return false;
    }
    if (endIdx < startIdx) {
      toast.error("End time cannot be earlier than start time");
      return false;
    }

    const isValid = await trigger([
      "carpetArea",
      "minimumBookingHours",
      "maximumPax",
      "type",
      "instantBooking",
      "hasSets",
      "operationalDays",
      "operationalHours"
    ]);
    return isValid;
  }, [listingDetails, trigger]);

  const validateSetsStep = useCallback(async () => {
    if (hasSets) {
      if (!additionalSetPricingType) {
        setSetsError("Please select a pricing type for additional sets");
        return false;
      }

      if ((sets?.length ?? 0) < 2) {
        setSetsError("Please add at least 2 sets for a multi-set listing");
        return false;
      }

      for (let i = 0; i < (sets?.length ?? 0); i++) {
        if (!sets?.[i].name || sets[i].name.trim().length === 0) {
          setSetsError(`Please enter a name for Set ${i + 1}`);
          return false;
        }
        if ((sets?.[i].price ?? 0) <= 0) {
          setSetsError(`Please enter a valid price for Set ${i + 1}`);
          return false;
        }
      }

      if (setsHaveSamePrice && (unifiedSetPrice ?? 0) <= 0) {
        setSetsError("Please enter a valid unified price for all sets");
        return false;
      }
    }
    return trigger(["sets", "hasSets", "setsHaveSamePrice", "unifiedSetPrice", "additionalSetPricingType"]);
  }, [additionalSetPricingType, hasSets, sets, setsHaveSamePrice, unifiedSetPrice, trigger]);

  const validateVerificationStep = useCallback(async () => {
    const hasDocs = verifications?.documents && verifications.documents.length > 0;
    if (!hasDocs) {
      setVerificationError("Please upload verification documents");
      return false;
    }
    return trigger(["verifications"]);
  }, [verifications, trigger]);

  const removeImage = useCallback((idx: number) => {
    setCustomValue(
      "imageSrc",
      imageSrc.filter((_: unknown, i: number) => i !== idx)
    );
  }, [imageSrc, setCustomValue]);

  const handleTermsAndConditions = useCallback((accept: boolean) => {
    setValue("terms", accept, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const handleSignature = useCallback((sig: SignatureMeta) => {
    setValue("agreementSignature", sig, { shouldDirty: true });
  }, [setValue]);

  const handleVerificationChange = useCallback((v: VerificationPayload) => {
    setValue("verifications", v, { shouldDirty: true, shouldValidate: true });
    setVerificationError("");
  }, [setValue]);

  const handleDetailsChange = useCallback((details: ListingDetails) => {
    setValue("carpetArea", details.carpetArea, { shouldDirty: true, shouldValidate: true });
    setValue("minimumBookingHours", details.minimumBookingHours, { shouldDirty: true, shouldValidate: true });
    setValue("maximumPax", details.maximumPax, { shouldDirty: true, shouldValidate: true });
    setValue("instantBooking", details.instantBooking, { shouldDirty: true });
    setValue("type", details.type, { shouldDirty: true, shouldValidate: true });
    setValue("hasSets", details.hasSets, { shouldDirty: true });
    setValue("operationalDays", details.operationalDays, { shouldDirty: true, shouldValidate: true });

    if (!details.hasSets) {
      setValue("sets", [], { shouldDirty: true, shouldValidate: true });
      setValue("setsHaveSamePrice", false, { shouldDirty: true });
      setValue("unifiedSetPrice", null, { shouldDirty: true });
      setValue("additionalSetPricingType", null, { shouldDirty: true });
    }

    if (details.operationalHours?.start && details.operationalHours?.end) {
      setValue("operationalHours", details.operationalHours, { shouldDirty: true, shouldValidate: true });
    }
  }, [setValue]);

  const handleAmenitiesChange = useCallback((v: { predefined: { [key: string]: boolean }; custom: string[] }) => {
    const nextAmenities = Object.keys(v.predefined || {}).filter((k) => Boolean(v.predefined[k]));
    const nextCustomAmenities = Array.isArray(v.custom) ? v.custom : [];

    setValue("amenities", nextAmenities, { shouldDirty: true, shouldValidate: true });
    setValue("otherAmenities", nextCustomAmenities, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const handleAddonChange = useCallback((v: Addon[]) => {
    setValue("addons", v, { shouldDirty: true });
  }, [setValue]);

  const validatePackagesStep = useCallback(async () => {
    return trigger("packages");
  }, [trigger]);

  const validateCustomTermsStep = useCallback(async () => {
    return trigger("customTerms");
  }, [trigger]);

  const stepDefinitions = useMemo<Record<STEPS, StepDefinition>>(
    () => ({
      [STEPS.CATEGORY]: {
        id: STEPS.CATEGORY,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateCategoryStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Choose your space type" subtitle="Pick a category" variant="h5" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              {categories.map((item) => (
                <CategoryInput
                  key={item.label}
                  onClick={(c) => {
                    setCustomValue("category", c);
                    setCategoryError("");
                  }}
                  selected={category === item.label}
                  label={item.label}
                  icon={item.icon}
                />
              ))}
            </div>
            {categoryError && <p className="text-destructive text-sm">{categoryError}</p>}
          </div>
        ),
      },
      [STEPS.LOCATION]: {
        id: STEPS.LOCATION,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateLocationStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Where is your space?" subtitle="Help creators find you" variant="h5" />
            <div className="w-full">
              <label className="block text-sm font-medium text-foreground mb-1">
                City <span className="text-destructive ml-1">*</span>
              </label>
              <CitySelect
                value={actualLocation as CitySelectValue | undefined}
                locationValue={locationValue}
                onChange={(v) => {
                  setCustomValue("actualLocation", {
                    ...actualLocation,
                    ...v,
                  });
                  setCityError("");
                }}
              />
              {cityError && <p className="text-destructive text-sm mt-1">{cityError}</p>}
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-foreground mb-1">
                Address <span className="text-destructive ml-1">*</span>
              </label>
              <AutoComplete
                value={actualLocation?.display_name || ""}
                onChange={(sel: AutoCompleteValue) => {
                  setCustomValue("actualLocation", {
                    ...actualLocation,
                    display_name: sel.display_name,
                    latlng: sel.latlng,
                  });
                  setAddressError("");
                }}
              />
              {addressError && <p className="text-destructive text-sm mt-1">{addressError}</p>}
            </div>
            <div className="w-full">
              <Input
                id="additionalInfo"
                label="Additional Info"
                type="text"
                disabled={isLoading}
                placeholder="Apartment, suite, unit, building, floor, etc."
                value={actualLocation?.additionalInfo || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomValue("actualLocation", {
                    ...actualLocation,
                    additionalInfo: value,
                  });
                }}
              />
            </div>
            <Map center={actualLocation?.latlng as [number, number] | undefined} />
          </div>
        ),
      },
      [STEPS.IMAGES]: {
        id: STEPS.IMAGES,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateImagesStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Add photos" subtitle="Show what your space looks like (Max 30 images)" variant="h5" />
            {imageSrc.length < 30 && (
              <div className="w-full">
                <div className={`h-40 ${imageError ? "border-destructive" : ""}`}>
                  <ImageUpload
                    uid="rent-main-upload"
                    onChange={(v) => setCustomValue("imageSrc", v)}
                    values={imageSrc}
                    deferUpload
                    className="w-full h-full p-4 border border-border rounded-xl"
                  />
                </div>
              </div>
            )}
            {imageError && <p className="text-destructive text-sm mt-1">{imageError}</p>}
            {imageSrc.length > 0 && (
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start mt-2">
                {imageSrc.map((item: string, index: number) => (
                  <div key={index} className="relative group">
                    <Image
                      src={item}
                      alt={`Image ${index}`}
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-xl object-cover border border-border "
                      unoptimized
                    />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
                      aria-label="Remove image"
                    >
                      <IoMdClose size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8 border-t pt-8">
              <Heading title="Property Video Tour" subtitle="Add a short video tour of your space (Optional)" variant="h5" />
              <div className="mt-4">
                <ImageUpload
                  uid="rent-video-upload"
                  label="Upload Video Tour"
                  onChange={(v) => setCustomValue("videoSrc", v[0] || null)}
                  values={videoSrc ? [videoSrc] : []}
                  allowedTypes={["video/mp4", "video/webm", "video/quicktime"]}
                  maxSize={100 * 1024 * 1024} // 100MB for video tour
                  className="w-full h-48 p-4 border border-border rounded-xl"
                />
              </div>
              {videoSrc && (
                <div className="mt-4 relative group w-full max-w-md mx-auto sm:mx-0">
                  <video
                    src={videoSrc}
                    controls
                    className="w-full h-48 rounded-xl object-cover border border-border"
                  />
                  <button
                    onClick={() => setCustomValue("videoSrc", null)}
                    className="absolute top-2 right-2 bg-foreground/60 hover:bg-foreground/80 text-background rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
                    aria-label="Remove video"
                  >
                    <IoMdClose size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ),
      },
      [STEPS.DESCRIPTION]: {
        id: STEPS.DESCRIPTION,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateDescriptionStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Describe your space" subtitle="Add title, description & price" variant="h5" />
            <div className="w-full">
              <Input
                id="title"
                label="Title"
                placeholder="e.g. Modern Photo Studio"
                disabled={isLoading}
                register={register("title")}
                errors={errors}
                required
              />
            </div>
            <div className="w-full">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  Description
                  <span className="text-destructive ml-1">*</span>
                </label>
                <LexicalEditor
                  value={descriptionValue}
                  onChange={(html) =>
                    setValue("description", html, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="Tell creators what makes your space special..."
                  disabled={isLoading}
                />
                {errors.description && (
                  <span className="text-sm text-destructive">{errors.description.message as string}</span>
                )}
              </div>
            </div>
            <div className="w-full">
              <Input
                id="price"
                label="Price per Hour"
                disabled={isLoading}
                register={register("price", { required: true, valueAsNumber: true })}
                errors={errors}
                type="number"
                formatPrice
                required
                onNumberChange={(val) => setValue("price", val, { shouldValidate: true })}
              />
            </div>
          </div>
        ),
      },
      [STEPS.AMENITIES]: {
        id: STEPS.AMENITIES,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateAmenitiesStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Amenities" subtitle="Select all available amenities" variant="h5" />
            <AmenitiesCheckbox
              amenities={amenities}
              checked={Array.isArray(selectedAmenityIds) ? selectedAmenityIds : []}
              customAmenities={Array.isArray(selectedCustomAmenities) ? selectedCustomAmenities : []}
              onChange={handleAmenitiesChange}
            />
          </div>
        ),
      },
      [STEPS.ADDONS]: {
        id: STEPS.ADDONS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateAddonsStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Add-ons" subtitle="Additional chargeable facilities" variant="h5" />
            <div className="flex flex-col items-center w-full gap-4">
              <AddonsSelection addons={addons} initialSelectedAddons={selectedAddons ?? []} onSelectedAddonsChange={handleAddonChange} rentModal />
              <CustomAddonModal save={(v: unknown) => setAddons([...addons, v as Addon])} />
            </div>
          </div>
        ),
      },
      [STEPS.OTHERDETAILS]: {
        id: STEPS.OTHERDETAILS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateOtherDetailsStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Other Details" variant="h5" />
            <OtherListingDetails onChange={handleDetailsChange} data={listingDetails} />
          </div>
        ),
      },
      [STEPS.SETS]: {
        id: STEPS.SETS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateSetsStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Multiple Sets" subtitle="Configure your bookable sets" variant="h5" />
            <div>
              <label className="block text-sm font-medium mb-2">Additional Set Pricing Type *</label>
              <div className="flex gap-4">
                <label
                  className={`flex-1 p-4 border rounded-xl cursor-pointer transition ${additionalSetPricingType === "FIXED"
                    ? "border-foreground bg-muted ring-1 ring-foreground"
                    : "border-border hover:border-border/80"
                    }`}
                >
                  <input
                    type="radio"
                    name="pricingType"
                    value="FIXED"
                    checked={additionalSetPricingType === "FIXED"}
                    onChange={() => setValue("additionalSetPricingType", "FIXED", { shouldDirty: true, shouldValidate: true })}
                    className="hidden"
                  />
                  <div className="font-medium">Fixed Add-on</div>
                  <div className="text-sm text-muted-foreground mt-1">Each additional set adds a flat fee</div>
                </label>
                <label
                  className={`flex-1 p-4 border rounded-xl cursor-pointer transition ${additionalSetPricingType === "HOURLY"
                    ? "border-foreground bg-muted ring-1 ring-foreground"
                    : "border-border hover:border-border/80"
                    }`}
                >
                  <input
                    type="radio"
                    name="pricingType"
                    value="HOURLY"
                    checked={additionalSetPricingType === "HOURLY"}
                    onChange={() => setValue("additionalSetPricingType", "HOURLY", { shouldDirty: true, shouldValidate: true })}
                    className="hidden"
                  />
                  <div className="font-medium">Hourly Add-on</div>
                  <div className="text-sm text-muted-foreground mt-1">Each additional set adds per-hour charges</div>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Will all sets have the same price?</label>
              <div className="flex gap-4">
                <label
                  className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === true
                    ? "border-foreground bg-muted ring-1 ring-foreground"
                    : "border-border hover:border-border/80"
                    }`}
                >
                  <input
                    type="radio"
                    name="priceConsistency"
                    checked={setsHaveSamePrice === true}
                    onChange={() => setValue("setsHaveSamePrice", true, { shouldDirty: true, shouldValidate: true })}
                    className="hidden"
                  />
                  <div className="font-medium text-center">Yes, same price</div>
                </label>
                <label
                  className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === false
                    ? "border-foreground bg-muted ring-1 ring-foreground"
                    : "border-border hover:border-border/80"
                    }`}
                >
                  <input
                    type="radio"
                    name="priceConsistency"
                    checked={setsHaveSamePrice === false}
                    onChange={() => setValue("setsHaveSamePrice", false, { shouldDirty: true, shouldValidate: true })}
                    className="hidden"
                  />
                  <div className="font-medium text-center">No, different prices</div>
                </label>
              </div>
            </div>
            {setsHaveSamePrice !== null && (
              <div>
                <label className="block text-sm font-medium mb-2">Your Sets</label>
                <SetsEditor
                  sets={sets ?? []}
                  onChange={(updatedSets) => setValue("sets", updatedSets, { shouldDirty: true, shouldValidate: true })}
                  pricingType={additionalSetPricingType}
                  disabled={isLoading}
                  isPricingUniform={Boolean(setsHaveSamePrice)}
                  uniformPrice={unifiedSetPrice}
                  onUniformPriceChange={(price) => setValue("unifiedSetPrice", price, { shouldDirty: true, shouldValidate: true })}
                />
              </div>
            )}
            {setsError && <p className="text-destructive text-sm -mt-2">{setsError}</p>}
          </div>
        ),
      },
      [STEPS.CUSTOMTERMS]: {
        id: STEPS.CUSTOMTERMS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateCustomTermsStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Custom Terms and Conditions" subtitle="Add your own rules and policies for the space" variant="h5" />
            <div className="w-full">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Terms and Conditions</label>
                <LexicalEditor
                  value={watch("customTerms") || ""}
                  onChange={(html) =>
                    setValue("customTerms", html, {
                      shouldValidate: true,
                      shouldDirty: true,
                    })
                  }
                  placeholder="Enter custom terms and conditions for booking this space..."
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
        ),
      },
      [STEPS.PACKAGES]: {
        id: STEPS.PACKAGES,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validatePackagesStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Custom Packages" subtitle="Bundle your offerings" variant="h5" />
            <PackagesForm
              value={packages ?? []}
              onChange={(updatedPackages) => setValue("packages", updatedPackages, { shouldDirty: true, shouldValidate: true })}
              availableSets={hasSets ? (sets ?? []).map((s, i) => ({
                id: s.id || `temp-${i}`,
                name: s.name,
                description: s.description,
                images: s.images,
                price: s.price || 0,
                position: i,
                listingId: "",
                createdAt: "",
                updatedAt: ""
              })) : []}
            />
          </div>
        ),
      },
      [STEPS.VERIFICATION]: {
        id: STEPS.VERIFICATION,
        modalTitle: "Space Verification",
        actionLabel: "Next",
        validate: validateVerificationStep,
        render: () => (
          <div className="flex flex-col gap-4">
            <Heading title="Space Verification" subtitle="Upload verification documents" variant="h5" />
            <SpaceVerification
              onVerification={handleVerificationChange}
              initialDocuments={verifications?.documents || []}
            />
            {verificationError && <p className="text-destructive text-sm -mt-2">{verificationError}</p>}
          </div>
        ),
      },
      [STEPS.TERMS]: {
        id: STEPS.TERMS,
        modalTitle: "Host Agreement",
        actionLabel: "Complete Listing",
        render: () => (
          <div className="flex flex-col gap-4">
            <TermsAndConditionsModal
              ref={termsRef}
              onChange={handleTermsAndConditions}
              onSignature={handleSignature}
              onAgreementPdf={setAgreementPdf}
              value={signature}
              checked={Boolean(terms)}
            />
          </div>
        ),
      },
    }),
    [
      Map,
      actualLocation,
      additionalSetPricingType,
      addressError,
      addons,
      amenities,
      category,
      categoryError,
      cityError,
      descriptionValue,
      errors,
      handleAddonChange,
      handleAmenitiesChange,
      handleDetailsChange,
      handleSignature,
      handleTermsAndConditions,
      handleVerificationChange,
      hasSets,
      imageError,
      imageSrc,
      isLoading,
      listingDetails,
      packages,
      register,
      removeImage,
      selectedAddons,
      selectedAmenityIds,
      selectedCustomAmenities,
      sets,
      setsError,
      setsHaveSamePrice,
      setCustomValue,
      setValue,
      signature,
      terms,
      locationValue,
      validateCategoryStep,
      unifiedSetPrice,
      validateLocationStep,
      validateImagesStep,
      validateDescriptionStep,
      validateAddonsStep,
      validateOtherDetailsStep,
      validateSetsStep,
      validateVerificationStep,
      validatePackagesStep,
      validateCustomTermsStep,
      validateAmenitiesStep,
      verificationError,
      verifications,
      videoSrc,
      watch,
    ]
  );

  const currentStepDefinition = stepDefinitions[step];

  const onNext = async () => {
    resetStepErrors();

    if (currentStepDefinition.validate) {
      const isValid = await currentStepDefinition.validate();
      if (!isValid) {
        return;
      }
    }

    goToNextStep();
  };

  const resetFormStates = useCallback(() => {
    setAgreementPdf(null);
    setShowSuccessModal(false);
    setIsLoading(false);
    setIsSubmitting(false);

    reset();
    setStep(STEPS.CATEGORY);
  }, [reset]);

  useEffect(() => {
    if (!uiStore.modals.rent && !isSubmitting && !showSuccessModal) {
      resetFormStates();
    }
  }, [uiStore.modals.rent, isSubmitting, showSuccessModal, resetFormStates]);

  // Lock body scroll while the spinner overlay is visible
  useEffect(() => {
    if (isSubmitting) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isSubmitting]);

  const onSubmit: SubmitHandler<RentModalFormValues> = async (data) => {
    if (step !== STEPS.TERMS) {





      await onNext();
      return;
    }

    if (!data.terms || !data.agreementSignature) {
      return toast.error("Please accept the terms and conditions and provide your signature");
    }

    const locationValue =
      data.actualLocation?.value ||
      data.actualLocation?.label ||
      data.actualLocation?.display_name ||
      "";

    if (!locationValue) {
      return toast.error("Please select a valid city/location");
    }

    if (!data.actualLocation || !data.actualLocation.display_name) {
      return toast.error("Please select an accurate location using the address search");
    }

    const remoteImages = (data.imageSrc || []);

    setIsLoading(true);
    setIsSubmitting(true);

    const generatePdf = termsRef.current?.generateAndUploadPdf ?? null;

    uiStore.onClose("rent");

    try {
      const finalImageUrls = await uploadToR2(remoteImages, "listing_main");

      if (finalImageUrls.length === 0) {
        setIsLoading(false);
        setIsSubmitting(false);
        return toast.error("Please upload at least one image");
      }

      const payload = {
        title: data.title,
        description: data.description,
        imageSrc: finalImageUrls,
        category: data.category,
        locationValue,
        actualLocation: {
          ...data.actualLocation,
          latlng: data.actualLocation.latlng as [number, number]
        },
        price: Number(data.price),
        amenities: Array.isArray(data.amenities) ? data.amenities : [],
        otherAmenities: Array.isArray(data.otherAmenities) ? data.otherAmenities : [],
        addons: Array.isArray(data.addons) ? data.addons : [],
        carpetArea: data.carpetArea,
        operationalHours: (data.operationalHours?.start && data.operationalHours?.end) ? {
          start: String(data.operationalHours.start),
          end: String(data.operationalHours.end)
        } : undefined,
        operationalDays: (data.operationalDays?.start && data.operationalDays?.end) ? {
          start: String(data.operationalDays.start),
          end: String(data.operationalDays.end)
        } : undefined,
        minimumBookingHours: Number(data.minimumBookingHours || 1),
        maximumPax: Number(data.maximumPax || 1),
        instantBooking: data.instantBooking ?? false,
        type: data.type ?? [],
        packages: Array.isArray(data.packages) ? (data.packages as Package[]).map(p => ({
          ...p,
          isActive: p.isActive !== false,
        })) : [],
        verifications: data.verifications || undefined,
        agreementSignature: data.agreementSignature || undefined,
        terms: data.terms,
        customTerms: isRichTextEmpty(data.customTerms) ? undefined : String(data.customTerms).trim(),
        hasSets: data.hasSets,
        setsHaveSamePrice: Boolean(data.setsHaveSamePrice),
        unifiedSetPrice: data.setsHaveSamePrice ? Number(data.unifiedSetPrice) : undefined,
        additionalSetPricingType: data.hasSets ? data.additionalSetPricingType : null,

        sets: data.hasSets ? (data.sets ?? []).map((s, i) => ({
          name: String(s.name).trim(),
          description: s.description ? String(s.description).trim() : null,
          images: Array.isArray(s.images) ? (s.images as string[]) : [],
          price: Number(s.price || 0),
          position: i,
        })) : [],
      };

      const finalSets = [...payload.sets];
      if (data.hasSets && finalSets.length > 0) {
        for (let i = 0; i < finalSets.length; i++) {
          const set = finalSets[i];
          if (set.images && set.images.length > 0) {
            finalSets[i].images = await uploadToR2(set.images, "listing_sets");
          }
        }
      }
      payload.sets = finalSets;

      const createdListing = await createListingAction(payload);
      const listingId = createdListing?.data?.id;

      if (!listingId) {
        throw new Error("Listing creation failed: No listing ID returned");
      }

      const uploadedVerificationDocs: VerificationDocument[] = [];

      if (data.verifications?.documents && data.verifications.documents.length > 0) {
        const docsWithFiles = data.verifications.documents.filter((doc) => doc.file);
        if (docsWithFiles.length > 0) {
          try {
            const filesToUpload = docsWithFiles.map(d => d.file as File);
            const uploadedUrls = await uploadToR2(filesToUpload, `verifications/${listingId}`);

            for (let i = 0; i < docsWithFiles.length; i++) {
              const doc = docsWithFiles[i];
              if (uploadedUrls[i]) {
                uploadedVerificationDocs.push({
                  original_filename: doc.original_filename,
                  bytes: doc.bytes || 0,
                  format: 'pdf',
                  resource_type: 'raw',
                  public_id: `verifications/${listingId}/${doc.original_filename}`,
                  version: 1,
                  url: uploadedUrls[i],
                });
              }
            }
          } catch (uploadError) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : "Failed to upload verification documents";
            toast.error(`Listing created but ${errorMessage}. Please contact support to upload documents.`);
          }
        }
      }

      const finalVerifications: Record<string, unknown> = {
        ...(data.verifications || {}),
        documents: uploadedVerificationDocs.length > 0 ? uploadedVerificationDocs : data.verifications?.documents || [],
      };

      if (data.agreementSignature && data.terms && generatePdf) {
        try {
          const meta = await generatePdf(listingId);
          setAgreementPdf(meta);

          finalVerifications.agreementPdf = meta;
        } catch (pdfError) {
          const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to save agreement PDF";
          toast.error(`Listing created but ${errorMessage}. Please contact support.`);
        }
      }

      if (uploadedVerificationDocs.length > 0 || (data.agreementSignature && data.terms)) {
        try {
          await updateListingAction({
            id: listingId,
            verifications: finalVerifications,
          });
        } catch (updateError) {
          const errorMessage = updateError instanceof Error ? updateError.message : "Failed to update verification documents";
          toast.error(`Listing created but ${errorMessage}. Please contact support.`);
        }
      }

      setShowSuccessModal(true);
      toast.success("Listing created successfully!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong while creating the listing.";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };



  const actionLabel = currentStepDefinition.actionLabel;

  const secondActionLabel = currentStepIndex <= 0 ? undefined : "Back";


  const progress = activeSteps.length > 0
    ? ((currentStepIndex + 1) / activeSteps.length) * 100
    : 0;


  const bodyContent = currentStepDefinition.render();

  return (
    <>
      <Modal
        disabled={isLoading}
        isOpen={uiStore.modals.rent}
        disableOverlayClose={true}
        title={currentStepDefinition.modalTitle}
        actionLabel={actionLabel}
        onSubmitAction={() => {
          if (step === STEPS.TERMS) {
            handleSubmit(onSubmit, (errors) => {
              if (errors.terms || !signature?.url) {
                toast.error("Please accept the terms and conditions and provide your signature");
              } else {
                toast.error("Please ensure all requirements in previous steps are correctly filled.");
              }
            })();
          } else {
            onNext();
          }
        }}
        secondaryActionLabel={secondActionLabel}
        secondaryActionAction={currentStepIndex <= 0 ? undefined : onBack}
        onCloseAction={() => uiStore.onClose("rent")}
        selfActionButton={false}


        body={
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-2">
              <span>Step {currentStepIndex + 1} of {activeSteps.length}</span>
              <div className="flex-1 mx-2 bg-muted rounded-full h-2">
                <div
                  className="bg-foreground h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            {bodyContent}
          </>
        }

        bodyRef={bodyRef}
        customWidth="w-full md:w-5/6 lg:w-4/6 xl:w-3/6"
        customHeight="h-[90vh]"
      />

      {/* Creating Listing Spinner Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-1000 flex items-center justify-center bg-foreground/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl  ring-1 ring-foreground/5 px-10 py-12 flex flex-col items-center gap-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in duration-300">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-muted" />
              <div className="absolute inset-0 rounded-full border-4 border-t-foreground animate-spin" />
            </div>
            <div className="text-center">
              <h5 className="text-xl font-semibold text-foreground">Creating your listing</h5>
              <p className="text-sm text-muted-foreground mt-2">Uploading images and setting up your space...</p>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showSuccessModal}
        onCloseAction={() => { setShowSuccessModal(false); }}
        onSubmitAction={() => { setShowSuccessModal(false); }}
        title="Listing Submitted 🎉"
        customHeight="h-auto"
        actionLabel="Close"
        body={
          <div className="flex flex-col gap-3 text-muted-foreground text-center">
            <p>Thank you for submitting your studio!</p>
            <p>Our team will review and verify your listing shortly.</p>
            <p>We&apos;ll notify you once it&apos;s live on ContCave.</p>
          </div>
        }
      />
    </>
  );
}

