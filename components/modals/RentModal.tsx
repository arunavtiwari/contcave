"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import useRentModal from "@/hook/useRentModal";
import Heading from "../Heading";
import Modal from "./Modal";
import Input from "../inputs/Input";
import CategoryInput from "../inputs/CategoryInput";
import CitySelect from "../inputs/CitySelect";
import AutoComplete from "../inputs/AutoComplete";
import ImageUpload from "../inputs/ImageUpload";
import AmenitiesCheckbox from "../inputs/AmenityCheckbox";
import AddonsSelection, { Addon } from "../inputs/AddonsSelection";
import OtherListingDetails, { ListingDetails } from "../inputs/OtherListingDetails";
import SpaceVerification from "../inputs/SpaceVerification";
import TermsAndConditionsModal from "../inputs/TermsAndConditions";
import CustomAddonModal from "./CustomAddonModal";
import PackagesForm, { Package } from "../inputs/PackagesForm";
import { categories } from "../navbar/Categories";
import getAmenities from "@/app/actions/getAmenities";
import getAddons from "@/app/actions/getAddons";
import { Amenities, CustomAmenities } from "@prisma/client";

enum STEPS {
  CATEGORY = 0,
  LOCATION,
  IMAGES,
  DESCRIPTION,
  PRICE,
  AMENITIES,
  ADDONS,
  PACKAGES,
  OTHERDETAILS,
  VERIFICATION,
  TERMS,
}

export default function RentModal() {
  const router = useRouter();
  const rentModel = useRentModal();

  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenities[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [customAmenities, setCustomAmenities] = useState<CustomAmenities[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState({
    predefined: {} as Record<string, boolean>,
    custom: [] as string[],
  });
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [listingDetails, setListingDetails] = useState<ListingDetails>();
  const [verifications, setVerifications] = useState<any>();
  const [terms, setTerms] = useState(false);
  const [signature, setSignature] = useState<any>(null);
  const [packages, setPackages] = useState<Package[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [agreementPdf, setAgreementPdf] = useState<any>(null);

  const termsRef = useRef<any>(null);
  const Map = useMemo(() => dynamic(() => import("../Map"), { ssr: false }), []);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      category: "",
      location: null,
      actualLocation: null,
      imageSrc: [],
      title: "",
      description: "",
      price: 1,
      addons: [],
    },
  });

  const category = watch("category");
  const location = watch("location");
  const actualLocation = watch("actualLocation");
  const imageSrc = watch("imageSrc");

  // Fetch Amenities & Addons
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

  // Helpers
  const setCustomValue = useCallback(
    (id: string, value: any) => {
      setValue(id, value, { shouldValidate: true, shouldDirty: true });
    },
    [setValue]
  );

  const hasVerification = useMemo(() => {
    const docs = verifications?.documents || [];
    const vids = verifications?.videos || [];
    return docs.length > 0 || vids.length > 0;
  }, [verifications]);

  const onBack = () => setStep((v) => v - 1);

  const onNext = () => {
    // validations before moving to next step
    if (step === STEPS.CATEGORY && !category)
      return toast.error("Please select a category");
    if (step === STEPS.LOCATION && !location)
      return toast.error("Please select a location");
    if (step === STEPS.IMAGES && (!imageSrc || imageSrc.length === 0))
      return toast.error("Please upload at least one image");
    if (step === STEPS.OTHERDETAILS && !listingDetails)
      return toast.error("Please complete all 'Other Details'");
    if (step === STEPS.VERIFICATION && !hasVerification)
      return toast.error("Please upload verification documents");
    setStep((v) => v + 1);
  };

  const removeImage = (idx: number) => {
    setCustomValue(
      "imageSrc",
      imageSrc.filter((_: any, i: number) => i !== idx)
    );
  };

  const handleTermsAndConditions = (accept: boolean) => setTerms(accept);
  const handleSignature = (sig: any) => setSignature(sig);
  const handleVerificationChange = (v: any) => setVerifications(v);
  const handleAmenitiesChange = (v: typeof selectedAmenities) =>
    setSelectedAmenities(v);
  const handleAddonChange = (v: Addon[]) => setSelectedAddons(v);
  const handleDetailsChange = (v: ListingDetails) => setListingDetails(v);

  // Submit
  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.TERMS) return onNext();
  
    const locationValue =
      data.location?.value ||
      data.location?.label ||
      data.location?.name ||
      "";
  
    if (!locationValue) return toast.error("Please select a valid city/location");
  
    const payload = {
      title: data.title,
      description: data.description,
      imageSrc: data.imageSrc,
      category: data.category,
      locationValue,
      actualLocation: data.actualLocation,
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
    };
  
    setIsLoading(true);
    try {
      // Create the listing
      const createRes = await axios.post("/api/listings", payload);
      const listingId = createRes.data?.id;
  
      if (!listingId) throw new Error("Listing creation failed");
  
      // Generate/upload agreement PDF if terms & signature are present
      if (signature && terms && termsRef.current?.generateAndUploadPdf) {
        const meta = await termsRef.current.generateAndUploadPdf(`agreements/${listingId}`);
        setAgreementPdf(meta);
  
        const mergedVerifications = {
          ...(verifications || {}),
          agreementPdf: meta,
        };
  
        await axios.patch(`/api/listings/${listingId}`, {
          verifications: mergedVerifications,
        });
  
        console.log("[RentModal] Saved agreement PDF inside verifications");
      }
  
      setShowSuccessModal(true);
      router.refresh();
      reset();
      setStep(STEPS.CATEGORY);
      rentModel.onClose();
      toast.success("Listing created successfully!");
    } catch (e) {
      console.error(e);
      toast.error("Something went wrong while creating the listing.");
    } finally {
      setIsLoading(false);
    }
  };
  

  // Dynamic labels
  const actionLabel = useMemo(() => {
    if (step === STEPS.TERMS) return "Create";
    if (step === STEPS.OTHERDETAILS) return "Verification";
    return "Next";
  }, [step]);

  const secondActionLabel = step === STEPS.CATEGORY ? undefined : "Back";

  // Progress
  const progress = ((step + 1) / (Object.keys(STEPS).length / 2)) * 100;

  // --- Step Content ---
  let bodyContent: React.ReactNode;

  switch (step) {
    case STEPS.CATEGORY:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Choose your space type" subtitle="Pick a category" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-2">
            {categories.map((item) => (
              <CategoryInput
                key={item.label}
                onClick={(c) => setCustomValue("category", c)}
                selected={category === item.label}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </div>
        </div>
      );
      break;

    case STEPS.LOCATION:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Where is your space?" subtitle="Help creators find you" />
          <CitySelect value={location} onChange={(v) => setCustomValue("location", v)} />
          <AutoComplete
            value={location ? location.display_name : ""}
            onChange={(sel: any) => {
              setCustomValue("actualLocation", {
                display_name: sel.display_name,
              });
            }}
          />
          <Map center={location?.latlng} />
        </div>
      );
      break;

    case STEPS.IMAGES:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Add photos" subtitle="Show what your space looks like" />
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            {imageSrc.map((item: string, index: number) => (
              <div key={index} className="relative group">
                <Image
                  src={item}
                  alt={`Image ${index}`}
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-xl object-cover border border-neutral-200 shadow-sm"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove image"
                >
                  ✕
                </button>
              </div>
            ))}
            {imageSrc.length < 8 && (
              <ImageUpload onChange={(v) => setCustomValue("imageSrc", v)} values={imageSrc} />
            )}
          </div>
        </div>
      );
      break;

    case STEPS.DESCRIPTION:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Describe your space" subtitle="Add title & description" />
          <Input id="title" label="Title" disabled={isLoading} register={register("title", { required: "Required" })} errors={errors} />
          <Input id="description" label="Description" disabled={isLoading} register={register("description", { required: "Required" })} errors={errors} />
        </div>
      );
      break;

    case STEPS.PRICE:
      bodyContent = (
        <div className="flex flex-col gap-4">
          <Heading title="Set your hourly price" />
          <Input id="price" label="Price" type="number" formatPrice disabled={isLoading} register={register("price", { required: "Required" })} errors={errors} />
        </div>
      );
      break;

    case STEPS.AMENITIES:
      bodyContent = (
        <div className="flex flex-col gap-6">
          <Heading title="Amenities" subtitle="Select all available amenities" />
          <AmenitiesCheckbox amenities={amenities} onChange={handleAmenitiesChange} />
        </div>
      );
      break;

    case STEPS.ADDONS:
      bodyContent = (
        <div className="flex flex-col gap-6">
          <Heading title="Add-ons" subtitle="Additional chargeable facilities" />
          <AddonsSelection addons={addons} initialSelectedAddons={selectedAddons} onSelectedAddonsChange={handleAddonChange} rentModal />
          <CustomAddonModal save={(v: any) => setAddons([...addons, v])} />
        </div>
      );
      break;

    case STEPS.PACKAGES:
      bodyContent = (
        <div className="flex flex-col gap-6">
          <Heading title="Custom Packages" subtitle="Bundle your offerings" />
          <PackagesForm value={packages} onChange={setPackages} />
        </div>
      );
      break;

    case STEPS.OTHERDETAILS:
      bodyContent = (
        <div className="flex flex-col gap-6">
          <Heading title="Other Details" />
          <OtherListingDetails onDetailsChange={handleDetailsChange} />
        </div>
      );
      break;

    case STEPS.VERIFICATION:
      bodyContent = (
        <div className="flex flex-col gap-6">
          <Heading title="Space Verification" subtitle="Upload verification documents" />
          <SpaceVerification onVerification={handleVerificationChange} />
        </div>
      );
      break;

    case STEPS.TERMS:
      bodyContent = (
        <div className="flex flex-col gap-6">
          <TermsAndConditionsModal
            ref={termsRef}
            onChange={handleTermsAndConditions}
            onSignature={handleSignature}
            onAgreementPdf={setAgreementPdf}
          />
        </div>
      );
      break;
  }

  return (
    <>
      <Modal
        disabled={isLoading || (step === STEPS.TERMS && !(terms && signature))}
        isOpen={rentModel.isOpen}
        title={
          step === STEPS.VERIFICATION
            ? "Space Verification"
            : step === STEPS.TERMS
            ? "Host Agreement"
            : "List Your Space"
        }
        actionLabel={actionLabel}
        onSubmit={handleSubmit(onSubmit)}
        secondaryActionLabel={secondActionLabel}
        secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
        onClose={rentModel.onClose}
        selfActionButton={false}
        autoWidth={step === STEPS.VERIFICATION || step === STEPS.ADDONS}
        customWidth={step === STEPS.VERIFICATION ? "w-1/2" : ""}
        body={
          <>
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-3 px-2">
              <span>Step {step + 1} of {Object.keys(STEPS).length / 2}</span>
              <div className="flex-1 mx-2 bg-neutral-200 rounded-full h-1">
                <div
                  className="bg-black h-1 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            {bodyContent}
          </>
        }
        verificationBtn={step === STEPS.TERMS}
        fixedHeight={step === STEPS.ADDONS}
        termsAndConditionsAccept={terms}
      />

      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onSubmit={() => setShowSuccessModal(false)}
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
