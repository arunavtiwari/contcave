"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Amenities } from "@prisma/client";
import axios from "axios";
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
import { toast } from "react-toastify";

import getAddons from "@/app/actions/getAddons";
import getAmenities from "@/app/actions/getAmenities";
import AddonsSelection from "@/components/inputs/AddonsSelection";
import AmenitiesCheckbox from "@/components/inputs/AmenityCheckbox";
import AutoComplete, { AutoCompleteValue } from "@/components/inputs/AutoComplete";
import CategoryInput from "@/components/inputs/CategoryInput";
import CitySelect, { CitySelectValue } from "@/components/inputs/CitySelect";
import ImageUpload from "@/components/inputs/ImageUpload";
import OtherListingDetails, { ListingDetails } from "@/components/inputs/OtherListingDetails";
import PackagesForm from "@/components/inputs/PackagesForm";
import SetsEditor, { SetEditorItem } from "@/components/inputs/SetsEditor";
import SpaceVerification, { VerificationDocument, VerificationPayload } from "@/components/inputs/SpaceVerification";
import TermsAndConditionsModal, { SignatureMeta, TermsRef } from "@/components/inputs/TermsAndConditions";
import { categories } from "@/components/navbar/Categories";
import LexicalEditor from "@/components/RichText/RichTextEditor"
import Heading from "@/components/ui/Heading";
import Input from "@/components/ui/Input";
import useRentModal from "@/hook/useRentModal";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { listingSchema } from "@/lib/schemas/listing";
import { Addon } from "@/types/addon";
import { Package } from "@/types/package";
import { AdditionalSetPricingType } from "@/types/set";

type LocationValue = CitySelectValue & {
  display_name?: string;
  additionalInfo?: string;
};

import CustomAddonModal from "./CustomAddonModal";
import Modal from "./Modal";

enum STEPS {
  CATEGORY = 0,
  LOCATION,
  IMAGES,
  DESCRIPTION,
  AMENITIES,
  ADDONS,
  OTHERDETAILS,
  SETS,
  PACKAGES,
  VERIFICATION,
  TERMS,
}

export default function RentModal() {
  const rentModel = useRentModal();

  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenities[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState({
    predefined: {} as Record<string, boolean>,
    custom: [] as string[],
  });
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [verifications, setVerifications] = useState<VerificationPayload>();
  const [terms, setTerms] = useState(false);
  const [signature, setSignature] = useState<SignatureMeta | null>(null);
  const [, setAgreementPdf] = useState<unknown>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [listingDetails, setListingDetails] = useState<ListingDetails>();
  const [additionalSetPricingType, setAdditionalSetPricingType] = useState<AdditionalSetPricingType | null>(null);
  const [sets, setSets] = useState<SetEditorItem[]>([]);
  const [setsHaveSamePrice, setSetsHaveSamePrice] = useState<boolean | null>(null);
  const [unifiedSetPrice, setUnifiedSetPrice] = useState<number | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [step]);


  useEffect(() => {
    if (setsHaveSamePrice && sets.length > 0) {

      const newPrice = unifiedSetPrice !== null ? unifiedSetPrice : (sets[0].price || 0);
      if (unifiedSetPrice !== newPrice) {
        setUnifiedSetPrice(newPrice);
      }


      const updatedSets = sets.map(s => ({ ...s, price: newPrice }));

      const hasChanges = updatedSets.some((s, i) => s.price !== sets[i].price);
      if (hasChanges) {
        setSets(updatedSets);
      }
    }
  }, [setsHaveSamePrice, unifiedSetPrice, sets]);




  const termsRef = useRef<TermsRef>(null);
  const Map = useMemo(() => dynamic(() => import("../Map"), { ssr: false }), []);

  const {
    register,
    getValues,
    setValue,
    watch,
    formState: { errors },
    reset,
    trigger,
  } = useForm<FieldValues>({
    resolver: zodResolver(listingSchema) as unknown as Resolver<FieldValues>,
    mode: "onTouched",
    defaultValues: {
      category: "",
      locationValue: "",
      actualLocation: null as LocationValue | null,
      imageSrc: [],
      title: "",
      description: "",
      price: 0,
      amenities: [],
      otherAmenities: [],
      type: [],
      instantBooking: false,
      hasSets: false,
      setsHaveSamePrice: false,
      unifiedSetPrice: null,
      sets: [],
      packages: [],
      carpetArea: "",
      operationalDays: { start: "Mon", end: "Sun" },
      operationalHours: { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: "",
      maximumPax: "",
      terms: false,
    },
  });
  const descriptionValue = watch("description");


  useEffect(() => {
    register("terms");
    register("category");
    register("locationValue");
    register("actualLocation");
    register("imageSrc");
  }, [register]);

  // Sync sets state with form state for validation
  useEffect(() => {
    if (listingDetails?.hasSets) {
      setValue("hasSets", true);
      setValue("sets", sets.map(s => ({
        ...s,
        price: s.price ?? 0 // Ensure price is a number for schema validation
      })), { shouldValidate: true });
      setValue("setsHaveSamePrice", setsHaveSamePrice);
      setValue("unifiedSetPrice", unifiedSetPrice);
      setValue("additionalSetPricingType", additionalSetPricingType);
    } else {
      setValue("hasSets", false);
      setValue("sets", []);
    }
  }, [
    listingDetails?.hasSets,
    sets,
    setsHaveSamePrice,
    unifiedSetPrice,
    additionalSetPricingType,
    setValue
  ]);

  const category = watch("category");
  const actualLocation = watch("actualLocation");
  const imageSrc = watch("imageSrc");
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
    (id: string, value: unknown) => {
      setValue(id as FieldPath<FieldValues>, value, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const onBack = () => {
    if (step === STEPS.PACKAGES && !listingDetails?.hasSets) {
      setStep(STEPS.OTHERDETAILS);
      return;
    }
    setStep((v) => v - 1);
  };

  const onNext = async () => {
    // Clear previous errors
    setCategoryError("");
    setCityError("");
    setAddressError("");
    setImageError("");
    setSetsError("");
    setVerificationError("");

    if (step === STEPS.CATEGORY) {
      const valid = await trigger("category");
      if (!valid) {
        setCategoryError("Please select a category");
        return;
      }
    }

    if (step === STEPS.LOCATION) {
      if (!actualLocation || !actualLocation.value) {
        setCityError("Please select a city");
        return;
      }
      if (!actualLocation.display_name) {
        setAddressError("Please enter a complete address");
        return;
      }
      const valid = await trigger("actualLocation");
      if (!valid) return;
    }

    if (step === STEPS.IMAGES) {
      const totalImages = (imageSrc || []).length;

      if (totalImages === 0) {
        setImageError("Please upload at least one image");
        return;
      }
      if (totalImages > 20) {
        setImageError("Maximum 20 images allowed");
        return;
      }

      const valid = await trigger("imageSrc");
      if (!valid) return;
    }

    if (step === STEPS.DESCRIPTION) {
      const isValid = await trigger(["title", "description", "price"]);
      if (!isValid) return;
      const currentPrice = Number(watch("price"));
      if (currentPrice <= 0) {
        toast.error("Price must be greater than 0");
        return;
      }
    }

    if (step === STEPS.SETS) {
      if (listingDetails?.hasSets) {
        if (!additionalSetPricingType) {
          setSetsError("Please select a pricing type for additional sets");
          return;
        }

        if (sets.length < 2) {
          setSetsError("Please add at least 2 sets for a multi-set listing");
          return;
        }

        for (let i = 0; i < sets.length; i++) {
          if (!sets[i].name || sets[i].name.trim().length === 0) {
            setSetsError(`Please enter a name for Set ${i + 1}`);
            return;
          }
          if ((sets[i].price ?? 0) <= 0) {
            setSetsError(`Please enter a valid price for Set ${i + 1}`);
            return;
          }
        }

        if (setsHaveSamePrice && (unifiedSetPrice ?? 0) <= 0) {
          setSetsError("Please enter a valid unified price for all sets");
          return;
        }
      }
    }

    if (step === STEPS.OTHERDETAILS) {
      if (!listingDetails) {
        toast.error("Please fill in all required fields");
        return;
      }
      if (!listingDetails.carpetArea || listingDetails.carpetArea.trim() === "") {
        toast.error("Please enter carpet area");
        return;
      }
      if (!listingDetails.minimumBookingHours || listingDetails.minimumBookingHours.trim() === "") {
        toast.error("Please enter minimum booking hours");
        return;
      }
      if (!listingDetails.maximumPax || listingDetails.maximumPax.trim() === "") {
        toast.error("Please enter maximum pax");
        return;
      }
      if (!listingDetails.type || listingDetails.type.length === 0) {
        toast.error("Please select at least one space type");
        return;
      }
    }

    if (step === STEPS.VERIFICATION) {
      const hasDocs = verifications?.documents && verifications.documents.length > 0;
      if (!hasDocs) {
        setVerificationError("Please upload verification documents");
        return;
      }
    }



    if (step === STEPS.OTHERDETAILS) {
      if (!listingDetails?.hasSets) {
        setStep(STEPS.PACKAGES);
        return;
      }
    }

    setStep((v) => v + 1);
  };

  const resetFormStates = useCallback(() => {
    setSelectedAmenities({ predefined: {}, custom: [] });
    setSelectedAddons([]);
    setVerifications(undefined);
    setTerms(false);
    setSignature(null);
    setAgreementPdf(null);
    setListingDetails(undefined);
    setShowSuccessModal(false);
    setIsLoading(false);
    setAdditionalSetPricingType(null);
    setSets([]);
    setSetsHaveSamePrice(null);
    setUnifiedSetPrice(null);

    reset();
    setStep(STEPS.CATEGORY);
  }, [reset]);

  useEffect(() => {
    if (!rentModel.isOpen) {
      resetFormStates();
    }
  }, [rentModel.isOpen, resetFormStates]);

  const removeImage = (idx: number) => {
    setCustomValue(
      "imageSrc",
      imageSrc.filter((_: unknown, i: number) => i !== idx)
    );
  };

  const handleTermsAndConditions = useCallback((accept: boolean) => {
    setTerms(accept);
    setValue("terms", accept, { shouldValidate: true });
  }, [setValue]);

  const handleSignature = useCallback((sig: SignatureMeta) => setSignature(sig), []);
  const handleVerificationChange = useCallback((v: VerificationPayload) => {
    setVerifications(v);
    setVerificationError(""); // Clear error when user uploads verification docs
  }, []);

  const handleDetailsChange = useCallback((details: ListingDetails) => {
    setListingDetails(details);

    setValue("carpetArea", details.carpetArea, { shouldValidate: true });
    setValue("minimumBookingHours", details.minimumBookingHours, { shouldValidate: true });
    setValue("maximumPax", details.maximumPax, { shouldValidate: true });
    setValue("instantBooking", details.instantBooking);
    setValue("type", details.type);
    setValue("hasSets", details.hasSets);
    setValue("operationalDays", details.operationalDays);

    if (!details.hasSets) {
      setSets([]);
      setSetsHaveSamePrice(null);
      setUnifiedSetPrice(null);
      setAdditionalSetPricingType(null);


      setValue("sets", [], { shouldValidate: true });
      setValue("setsHaveSamePrice", false);
      setValue("unifiedSetPrice", null);
      setValue("additionalSetPricingType", null);
    }

    if (details.operationalHours?.start && details.operationalHours?.end) {
      setValue("operationalHours", details.operationalHours, { shouldValidate: true });
    }
  }, [setValue]);
  const handleAmenitiesChange = useCallback((v: typeof selectedAmenities) =>
    setSelectedAmenities({
      predefined: Object.fromEntries(
        Object.entries(v.predefined || {}).map(([k, val]) => [String(k), Boolean(val)])
      ),
      custom: Array.isArray(v.custom) ? v.custom : [],
    }), []);
  const handleAddonChange = useCallback((v: Addon[]) => setSelectedAddons(v), []);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.TERMS) {





      await onNext();
      return;
    }

    if (!terms || !signature) {
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

    try {
      const finalImageUrls = await uploadToCloudinary(remoteImages, "listing_main");

      if (finalImageUrls.length === 0) {
        setIsLoading(false);
        return toast.error("Please upload at least one image");
      }

      const payload = {
        title: data.title,
        description: data.description,
        imageSrc: finalImageUrls,
        category: data.category,
        locationValue,
        actualLocation: data.actualLocation || null,
        price: Number(data.price),
        amenities: Object.keys(selectedAmenities.predefined).filter(
          (k) => selectedAmenities.predefined[k]
        ),
        otherAmenities: selectedAmenities.custom,
        addons: selectedAddons,
        carpetArea: listingDetails?.carpetArea,
        operationalDays: listingDetails?.operationalDays,
        operationalHours: listingDetails?.operationalHours,
        minimumBookingHours: listingDetails?.minimumBookingHours,
        maximumPax: listingDetails?.maximumPax,
        instantBooking: listingDetails?.instantBooking ?? false,
        type: listingDetails?.type ?? [],
        packages,
        verifications,
        agreementSignature: signature,
        terms,
        hasSets: listingDetails?.hasSets,
        setsHaveSamePrice: Boolean(setsHaveSamePrice),
        unifiedSetPrice: setsHaveSamePrice ? Number(unifiedSetPrice) : null,
        additionalSetPricingType: listingDetails?.hasSets ? additionalSetPricingType : null,

        sets: listingDetails?.hasSets ? sets.map((s, i) => ({
          name: s.name.trim(),
          description: s.description?.trim() || null,
          images: s.images,
          price: s.price,
          position: i,
        })) : [],
      };

      const finalSets = [...payload.sets];
      if (listingDetails?.hasSets && finalSets.length > 0) {
        for (let i = 0; i < finalSets.length; i++) {
          const set = finalSets[i];
          if (set.images && set.images.length > 0) {
            finalSets[i].images = await uploadToCloudinary(set.images, "listing_sets");
          }
        }
      }
      payload.sets = finalSets;

      const createRes = await axios.post("/api/listings", payload);
      const listingId = createRes.data?.data?.id || createRes.data?.id;

      if (!listingId) {
        throw new Error("Listing creation failed: No listing ID returned");
      }

      const uploadedVerificationDocs: VerificationDocument[] = [];

      if (verifications?.documents && verifications.documents.length > 0) {
        const docsWithFiles = verifications.documents.filter((doc) => doc.file);
        if (docsWithFiles.length > 0) {
          try {
            const filesToUpload = docsWithFiles.map(d => d.file as File);
            const uploadedUrls = await uploadToCloudinary(filesToUpload, `verifications/${listingId}`);

            for (let i = 0; i < docsWithFiles.length; i++) {
              const doc = docsWithFiles[i];
              if (uploadedUrls[i]) {
                // Note: uploadToCloudinary currently just returns the secure_url string.
                // We spoof the other fields since RentModal expects this format.
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
        ...(verifications || {}),
        documents: uploadedVerificationDocs.length > 0 ? uploadedVerificationDocs : verifications?.documents || [],
      };

      if (signature && terms && termsRef.current?.generateAndUploadPdf) {
        try {
          const meta = await termsRef.current.generateAndUploadPdf(listingId);
          setAgreementPdf(meta);

          finalVerifications.agreementPdf = meta;
        } catch (pdfError) {
          const errorMessage = pdfError instanceof Error ? pdfError.message : "Failed to save agreement PDF";
          toast.error(`Listing created but ${errorMessage}. Please contact support.`);
        }
      }

      if (uploadedVerificationDocs.length > 0 || (signature && terms)) {
        try {
          await axios.patch(`/api/listings/${listingId}`, {
            verifications: finalVerifications,
          });
        } catch (updateError) {
          const errorMessage = updateError instanceof Error ? updateError.message : "Failed to update verification documents";
          toast.error(`Listing created but ${errorMessage}. Please contact support.`);
        }
      }

      setShowSuccessModal(true);
      rentModel.onClose();
      resetFormStates();
      toast.success("Listing created successfully!");
    } catch (error) {
      let errorMessage = "Something went wrong while creating the listing.";

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const responseError = error.response?.data?.error;
        if (typeof responseError === "string") {
          errorMessage = responseError;
        } else if (status === 401) {
          errorMessage = "Authentication required. Please log in again.";
        } else if (status === 403) {
          errorMessage = "Only owners can create listings. Please verify your account.";
        } else if (status === 400) {
          errorMessage = responseError || "Invalid data. Please check your inputs.";
        } else if (status && status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  const actionLabel = useMemo(() => {
    if (step === STEPS.TERMS) return "Complete Listing";
    return "Next";
  }, [step]);

  const secondActionLabel = step === STEPS.CATEGORY ? undefined : "Back";


  const progress = ((step + 1) / (Object.keys(STEPS).length / 2)) * 100;


  let bodyContent: React.ReactNode;

  switch (step) {
    case STEPS.CATEGORY:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Choose your space type" subtitle="Pick a category" variant="h3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-2">
            {categories.map((item) => (
              <CategoryInput
                key={item.label}
                onClick={(c) => {
                  setCustomValue("category", c);
                  setCategoryError(""); // Clear error when user selects category
                }}
                selected={category === item.label}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
          {categoryError && (
            <p className="text-rose-500 text-sm">
              {categoryError}
            </p>
          )}
        </div>
      );
      break;

    case STEPS.LOCATION:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Where is your space?" subtitle="Help creators find you" variant="h3" />
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-rose-500 ml-1">*</span>
            </label>
            <CitySelect
              value={actualLocation as CitySelectValue | undefined}
              onChange={(v) => {
                // Merge city data with existing address data
                setCustomValue("actualLocation", {
                  ...actualLocation,
                  ...v,
                });
                setCityError(""); // Clear error when user selects a city
              }}
            />
            {cityError && (
              <p className="text-rose-500 text-sm mt-1">
                {cityError}
              </p>
            )}
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-rose-500 ml-1">*</span>
            </label>
            <AutoComplete
              value={actualLocation?.display_name || ""}
              onChange={(sel: AutoCompleteValue) => {
                // Merge address data with existing city data
                setCustomValue("actualLocation", {
                  ...actualLocation,
                  display_name: sel.display_name,
                  latlng: sel.latlng,
                });
                setAddressError(""); // Clear error when user enters address
              }}
            />
            {addressError && (
              <p className="text-rose-500 text-sm mt-1">
                {addressError}
              </p>
            )}
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
          <Map center={actualLocation?.latlng as number[] | undefined} />
        </div>
      );
      break;

    case STEPS.IMAGES:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Add photos" subtitle="Show what your space looks like (Max 20 images)" variant="h3" />

          {imageSrc.length < 20 && (
            <div className="w-full">
              <div className={`h-40 ${imageError ? 'border-rose-500' : ''}`}>
                <ImageUpload
                  uid="rent-main-upload"
                  onChange={(v) => setCustomValue("imageSrc", v)}
                  values={imageSrc}
                  deferUpload

                  className="w-full h-full p-4 border-2 border-neutral-300"
                />
              </div>
              {imageError && (
                <p className="text-rose-500 text-sm mt-1">
                  {imageError}
                </p>
              )}
            </div>
          )}

          {imageSrc.length > 0 && (
            <div className="flex flex-wrap gap-4 justify-center sm:justify-start mt-2">
              {imageSrc.map((item: string, index: number) => (
                <div key={index} className="relative group">
                  <Image
                    src={item}
                    alt={`Image ${index}`}
                    width={128}
                    height={128}
                    className="h-32 w-32 rounded-xl object-cover border border-neutral-200 shadow-xs"
                    unoptimized
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 opacity-0 group-hover:opacity-100 transition cursor-pointer flex items-center justify-center z-10"
                    aria-label="Remove image"
                  >
                    <IoMdClose size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      );
      break;

    case STEPS.DESCRIPTION:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Describe your space" subtitle="Add title, description & price" variant="h3" />
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
                <span className="text-rose-500 ml-1">*</span>
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
                <span className="text-sm text-rose-500">
                  {errors.description.message as string}
                </span>
              )}
            </div>
          </div>
          <div className="w-full">
            <Input
              id="price"
              label="Price"
              type="number"
              formatPrice
              placeholder="999"
              disabled={isLoading}
              register={register("price", { valueAsNumber: true })}
              errors={errors}
              required
            />
          </div>
        </div>
      );
      break;

    case STEPS.SETS:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Multiple Sets" subtitle="Configure your bookable sets" variant="h3" />

          <div>
            <label className="block text-sm font-medium mb-2">Additional Set Pricing Type *</label>
            <div className="flex gap-4">
              <label
                className={`flex-1 p-4 border rounded-xl cursor-pointer transition ${additionalSetPricingType === "FIXED"
                  ? "border-black bg-neutral-50 ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-300"
                  }`}
              >
                <input
                  type="radio"
                  name="pricingType"
                  value="FIXED"
                  checked={additionalSetPricingType === "FIXED"}
                  onChange={() => setAdditionalSetPricingType("FIXED")}
                  className="hidden"
                />
                <div className="font-medium">Fixed Add-on</div>
                <div className="text-sm text-neutral-500 mt-1">Each additional set adds a flat fee</div>
              </label>
              <label
                className={`flex-1 p-4 border rounded-xl cursor-pointer transition ${additionalSetPricingType === "HOURLY"
                  ? "border-black bg-neutral-50 ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-300"
                  }`}
              >
                <input
                  type="radio"
                  name="pricingType"
                  value="HOURLY"
                  checked={additionalSetPricingType === "HOURLY"}
                  onChange={() => setAdditionalSetPricingType("HOURLY")}
                  className="hidden"
                />
                <div className="font-medium">Hourly Add-on</div>
                <div className="text-sm text-neutral-500 mt-1">Each additional set adds per-hour charges</div>
              </label>
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium mb-2">Will all sets have the same price?</label>
            <div className="flex gap-4">
              <label
                className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === true
                  ? "border-black bg-neutral-50 ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-300"
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
                className={`flex-1 p-3 border rounded-xl cursor-pointer transition ${setsHaveSamePrice === false
                  ? "border-black bg-neutral-50 ring-1 ring-black"
                  : "border-neutral-200 hover:border-neutral-300"
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
          </div>

          {setsHaveSamePrice !== null && (
            <div>
              <label className="block text-sm font-medium mb-2">Your Sets</label>
              <SetsEditor
                sets={sets}
                onChange={setSets}
                pricingType={additionalSetPricingType}
                disabled={isLoading}

                isPricingUniform={setsHaveSamePrice}
                uniformPrice={unifiedSetPrice}
                onUniformPriceChange={setUnifiedSetPrice}
              />
            </div>
          )}

          {setsError && (
            <p className="text-rose-500 text-sm -mt-2">
              {setsError}
            </p>
          )}
        </div>
      );
      break;

    case STEPS.AMENITIES:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Amenities" subtitle="Select all available amenities" variant="h3" />
          <AmenitiesCheckbox
            amenities={amenities}
            checked={Object.keys(selectedAmenities.predefined).filter((k) => selectedAmenities.predefined[k])}
            customAmenities={selectedAmenities.custom}
            onChange={handleAmenitiesChange}
          />
        </div>
      );
      break;

    case STEPS.ADDONS:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Add-ons" subtitle="Additional chargeable facilities" variant="h3" />
          <div className="flex flex-col items-center w-full gap-4">
            <AddonsSelection addons={addons} initialSelectedAddons={selectedAddons} onSelectedAddonsChange={handleAddonChange} rentModal />
            <CustomAddonModal save={(v: unknown) => setAddons([...addons, v as Addon])} />
          </div>
        </div>
      );
      break;

    case STEPS.PACKAGES:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Custom Packages" subtitle="Bundle your offerings" variant="h3" />
          <PackagesForm
            value={packages}
            onChange={setPackages}
            availableSets={listingDetails?.hasSets ? sets.map((s, i) => ({
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
      );
      break;

    case STEPS.OTHERDETAILS:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Other Details" variant="h3" />
          <OtherListingDetails
            onChange={handleDetailsChange}
            data={listingDetails}
          />
        </div>
      );
      break;

    case STEPS.VERIFICATION:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Space Verification" subtitle="Upload verification documents" variant="h3" />
          <SpaceVerification
            onVerification={handleVerificationChange}
            initialDocuments={verifications?.documents || []}
          />
          {verificationError && (
            <p className="text-rose-500 text-sm -mt-2">
              {verificationError}
            </p>
          )}
        </div>
      );
      break;

    case STEPS.TERMS:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <TermsAndConditionsModal
            ref={termsRef}
            onChange={handleTermsAndConditions}
            onSignature={handleSignature}
            onAgreementPdf={setAgreementPdf}
            value={signature}
          />
        </div>
      );
      break;
  }

  return (
    <>
      <Modal
        disabled={isLoading}
        isOpen={rentModel.isOpen}
        disableOverlayClose={true}
        title={
          step === STEPS.VERIFICATION
            ? "Space Verification"
            : step === STEPS.TERMS
              ? "Host Agreement"
              : "List Your Space"
        }
        actionLabel={actionLabel}
        onSubmit={() => {
          if (step === STEPS.TERMS) {
            onSubmit(getValues());
          } else {
            onNext();
          }
        }}
        secondaryActionLabel={secondActionLabel}
        secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
        onClose={rentModel.onClose}
        selfActionButton={false}


        body={
          <>
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-3 px-2">
              <span>Step {step + 1} of {Object.keys(STEPS).length / 2}</span>
              <div className="flex-1 mx-2 bg-neutral-200 rounded-full h-2">
                <div
                  className="bg-black h-2 rounded-full transition-all"
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

      <Modal
        isOpen={showSuccessModal}
        onClose={() => { setShowSuccessModal(false); }}
        onSubmit={() => { setShowSuccessModal(false); }}
        title="Listing Submitted 🎉"
        actionLabel="Close"
        body={
          <div className="flex flex-col gap-3 text-gray-700 text-center">
            <p>Thank you for submitting your studio!</p>
            <p>Our team will review and verify your listing shortly.</p>
            <p>We&apos;ll notify you once it&apos;s live on ContCave.</p>
          </div>
        }
      />
    </>
  );
}
