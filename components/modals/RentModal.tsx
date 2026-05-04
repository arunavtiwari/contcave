"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Amenities } from "@prisma/client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FieldPath, Resolver, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { createListingAction, updateListingAction } from "@/app/actions/listingActions";
import { ListingDetails } from "@/components/inputs/OtherListingDetails";
import { SetEditorItem } from "@/components/inputs/SetsEditor";
import { VerificationDocument, VerificationPayload } from "@/components/inputs/SpaceVerification";
import { SignatureMeta, TermsRef } from "@/components/inputs/TermsAndConditions";
import Modal from "@/components/modals/Modal";
import { OPENING_HOURS_MAX_END, OPENING_HOURS_MIN_START, TIME_SLOTS } from "@/constants/timeSlots";
import useUIStore from "@/hooks/useUIStore";
import { isRichTextEmpty } from "@/lib/richText";
import { uploadToR2 } from "@/lib/storage/upload";
import {
  ListingSchema,
  listingSchema,
  LocationSchema,
} from "@/schemas/listing";
import { Addon } from "@/types/addon";
import { Package } from "@/types/package";

import AddonsStep from "./rent-steps/AddonsStep";
import AmenitiesStep from "./rent-steps/AmenitiesStep";
import CategoryStep from "./rent-steps/CategoryStep";
import CustomTermsStep from "./rent-steps/CustomTermsStep";
import DescriptionStep from "./rent-steps/DescriptionStep";
import ImagesStep from "./rent-steps/ImagesStep";
import LocationStep from "./rent-steps/LocationStep";
import OtherDetailsStep from "./rent-steps/OtherDetailsStep";
import PackagesStep from "./rent-steps/PackagesStep";
import SetsStep from "./rent-steps/SetsStep";
import TermsStep from "./rent-steps/TermsStep";
import VerificationStep from "./rent-steps/VerificationStep";
import VideoStep from "./rent-steps/VideoStep";

// removed unused LocationValue type

enum STEPS {
  CATEGORY = 0,
  LOCATION,
  IMAGES,
  VIDEO,
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
      STEPS.VIDEO,
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
      STEPS.VIDEO,
      STEPS.DESCRIPTION,
      STEPS.AMENITIES,
      STEPS.ADDONS,
      STEPS.OTHERDETAILS,
      STEPS.CUSTOMTERMS,
      STEPS.PACKAGES,
      STEPS.VERIFICATION,
      STEPS.TERMS,
    ];

type RentModalFormValues = ListingSchema;

type StepDefinition = {
  id: STEPS;
  modalTitle: string;
  actionLabel: string;
  validate?: () => Promise<boolean>;
  render: () => React.ReactNode;
};

interface RentModalProps {
  predefinedAmenities?: Amenities[];
  predefinedAddons?: Addon[];
}

export default function RentModal({ predefinedAmenities = [], predefinedAddons = [] }: RentModalProps) {
  const uiStore = useUIStore();

  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setAgreementPdf] = useState<unknown>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [step]);


  const termsRef = useRef<TermsRef>(null);

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
      actualLocation: null as LocationSchema | null,
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
  const actualLocation = watch("actualLocation") as LocationSchema | null;
  const locationValue = watch("locationValue");
  const imageSrc = watch("imageSrc");
  const videoSrc = watch("videoSrc");
  const selectedAmenityIds = watch("amenities") as string[] | undefined;
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
  const verifications = watch("verifications") as VerificationPayload | null | undefined;
  const terms = watch("terms");
  const signature = watch("agreementSignature");
  const otherAmenities = watch("otherAmenities");
  const customTerms = watch("customTerms");
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
    if (actualLocation?.value) {
      setValue("locationValue", actualLocation.value, { shouldValidate: true });
    }
  }, [actualLocation, setValue]);

  const setCustomValue = useCallback(
    (id: string, value: unknown) => {
      setValue(id as FieldPath<RentModalFormValues>, value as never, { shouldValidate: true, shouldDirty: true });
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

  const validateVideoStep = useCallback(async () => {
    return true;
  }, []);

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

  const handleTermsAndConditions = useCallback((accept: boolean) => {
    setValue("terms", accept, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);

  const handleSignature = useCallback((sig: SignatureMeta) => {
    setValue("agreementSignature", {
      url: sig.url,
      thumbnail: sig.thumbnail
    } as RentModalFormValues["agreementSignature"], { shouldDirty: true });
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
    setValue("operationalDays", {
      start: details.operationalDays.start || "Mon",
      end: details.operationalDays.end || "Sun"
    }, { shouldDirty: true, shouldValidate: true });

    if (!details.hasSets) {
      setValue("sets", [], { shouldDirty: true, shouldValidate: true });
      setValue("setsHaveSamePrice", false, { shouldDirty: true });
      setValue("unifiedSetPrice", null, { shouldDirty: true });
      setValue("additionalSetPricingType", null, { shouldDirty: true });
    }

    if (details.operationalHours?.start && details.operationalHours?.end) {
      setValue("operationalHours", {
        start: details.operationalHours.start,
        end: details.operationalHours.end
      }, { shouldDirty: true, shouldValidate: true });
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
          <CategoryStep
            category={category}
            setCustomValue={setCustomValue}
            categoryError={categoryError}
            setCategoryError={setCategoryError}
          />
        ),
      },
      [STEPS.LOCATION]: {
        id: STEPS.LOCATION,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateLocationStep,
        render: () => (
          <LocationStep
            actualLocation={actualLocation}
            locationValue={locationValue}
            setCustomValue={setCustomValue}
            cityError={cityError}
            setCityError={setCityError}
            addressError={addressError}
            setAddressError={setAddressError}
            isLoading={isLoading}
          />
        ),
      },
      [STEPS.IMAGES]: {
        id: STEPS.IMAGES,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateImagesStep,
        render: () => (
          <ImagesStep
            imageSrc={imageSrc}
            setCustomValue={setCustomValue}
            imageError={imageError}
            setImageError={setImageError}
          />
        ),
      },
      [STEPS.VIDEO]: {
        id: STEPS.VIDEO,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateVideoStep,
        render: () => <VideoStep videoSrc={videoSrc ?? null} setCustomValue={setCustomValue} />,
      },
      [STEPS.DESCRIPTION]: {
        id: STEPS.DESCRIPTION,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateDescriptionStep,
        render: () => (
          <DescriptionStep
            register={register}
            errors={errors}
            isLoading={isLoading}
            watch={watch}
            setValue={setValue as never}
          />
        ),
      },
      [STEPS.AMENITIES]: {
        id: STEPS.AMENITIES,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateAmenitiesStep,
        render: () => (
          <AmenitiesStep
            amenities={selectedAmenityIds || []}
            amenitiesData={predefinedAmenities}
            otherAmenities={otherAmenities || []}
            handleAmenitiesChange={handleAmenitiesChange}
          />
        ),
      },
      [STEPS.ADDONS]: {
        id: STEPS.ADDONS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateAddonsStep,
        render: () => (
          <AddonsStep
            selectedAddons={selectedAddons || []}
            addonsData={predefinedAddons}
            handleAddonChange={handleAddonChange}
            setValue={setValue as never}
          />
        ),
      },
      [STEPS.OTHERDETAILS]: {
        id: STEPS.OTHERDETAILS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateOtherDetailsStep,
        render: () => (
          <OtherDetailsStep
            listingDetails={listingDetails}
            handleDetailsChange={handleDetailsChange}
          />
        ),
      },
      [STEPS.SETS]: {
        id: STEPS.SETS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateSetsStep,
        render: () => (
          <SetsStep
            hasSets={hasSets}
            sets={sets as SetEditorItem[]}
            additionalSetPricingType={additionalSetPricingType ?? null}
            setsHaveSamePrice={Boolean(setsHaveSamePrice)}
            unifiedSetPrice={unifiedSetPrice ?? null}
            setsError={setsError}
            setCustomValue={setCustomValue}
            setSetsError={setSetsError}
          />
        ),
      },
      [STEPS.CUSTOMTERMS]: {
        id: STEPS.CUSTOMTERMS,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateCustomTermsStep,
        render: () => (
          <CustomTermsStep
            customTerms={customTerms || ""}
            setValue={setValue as never}
          />
        ),
      },
      [STEPS.PACKAGES]: {
        id: STEPS.PACKAGES,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validatePackagesStep,
        render: () => (
          <PackagesStep
            packages={packages || []}
            hasSets={hasSets}
            sets={sets as SetEditorItem[]}
            setValue={setValue as never}
          />
        ),
      },
      [STEPS.VERIFICATION]: {
        id: STEPS.VERIFICATION,
        modalTitle: "List Your Space",
        actionLabel: "Next",
        validate: validateVerificationStep,
        render: () => (
          <VerificationStep
            verifications={verifications || { documents: [] } as VerificationPayload}
            verificationError={verificationError}
            handleVerificationChange={handleVerificationChange}
          />
        ),
      },
      [STEPS.TERMS]: {
        id: STEPS.TERMS,
        modalTitle: "List Your Space",
        actionLabel: "Create Listing",
        validate: async () => true,
        render: () => (
          <TermsStep
            terms={Boolean(terms)}
            agreementSignature={signature ?? null}
            termsRef={termsRef}
            handleTermsAndConditions={handleTermsAndConditions}
            handleSignature={handleSignature}
          />
        ),
      },
    }),
    [
      actualLocation,
      additionalSetPricingType,
      addressError,
      predefinedAddons,
      predefinedAmenities,
      category,
      categoryError,
      cityError,
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
      selectedAddons,
      selectedAmenityIds,
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
      customTerms,
      otherAmenities,
      validateVideoStep,
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

      let finalVideoUrl = data.videoSrc;
      if (data.videoSrc && data.videoSrc.startsWith('blob:')) {
        const uploadedVideos = await uploadToR2([data.videoSrc], "listing_videos");
        finalVideoUrl = uploadedVideos[0];
      }

      if (finalImageUrls.length === 0) {
        setIsLoading(false);
        setIsSubmitting(false);
        return toast.error("Please upload at least one image");
      }

      const payload = {
        title: data.title,
        description: data.description,
        imageSrc: finalImageUrls,
        videoSrc: finalVideoUrl,
        category: data.category,
        locationValue,
        actualLocation: {
          ...data.actualLocation!,
          latlng: data.actualLocation!.latlng as [number, number]
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
                  original_filename: doc.original_filename || "",
                  bytes: doc.bytes || 0,
                  format: 'pdf',
                  resource_type: 'raw',
                  public_id: `verifications/${listingId}/${doc.original_filename || "doc"}`,
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
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
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

