"use client";

import useRentModal from "@/hook/useRentModal";
import axios from "axios";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { toast } from "react-toastify";
import Heading from "../Heading";
import CategoryInput from "../inputs/CategoryInput";
import CitySelect from "../inputs/CitySelect";
import ImageUpload from "../inputs/ImageUpload";
import Input from "../inputs/Input";
import { categories } from "../navbar/Categories";
import Modal from "./Modal";
import AmenitiesCheckbox from "../inputs/AmenityCheckbox";
import getAmenities from "@/app/actions/getAmenities";
import { Addons, Amenities, CustomAmenities } from "@prisma/client";
import getAddons from "@/app/actions/getAddons";
import AddonsSelection, { Addon } from "../inputs/AddonsSelection";
import OtherListingDetails, { ListingDetails } from "../inputs/OtherListingDetails";
import SpaceVerification from "../inputs/SpaceVerification";
import TermsAndConditionsModal from "../inputs/TermsAndConditions";
import { useRef } from "react";
import CustomAddonModal from "./CustomAddonModal";
import AutoComplete from "../inputs/AutoComplete";
import PackagesForm, { Package } from "../inputs/PackagesForm";
import Image from "next/image";

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  IMAGES = 2,
  DESCRIPTION = 3,
  PRICE = 4,
  AMENITIES = 5,
  ADDONS = 6,
  PACKAGES = 7,
  OTHERDETAILS = 8,
  VERIFICATION = 9,
  TERMS = 10,
}

function RentModal() {
  const router = useRouter();
  const rentModel = useRentModal();
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenities[]>([]);
  const [listingDetails, setListingDetails] = useState<ListingDetails>();
  const [customAmenities, setCustomAmenities] = useState<CustomAmenities[]>([]);
  const [verifications, setVerifications] = useState<any>();
  const [terms, setTerms] = useState<boolean>(false);
  const [signature, setSignature] = useState<any>(null);
  const [addons, setAddons] = useState<any[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<{
    predefined: { [key: string]: boolean };
    custom: string[];
  }>({ predefined: {}, custom: [] });
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const Map = useMemo(() => dynamic(() => import("../Map"), { ssr: false }), []);

  const hasVerification = useMemo(() => {
    const docs = Array.isArray(verifications?.documents) ? (verifications!.documents as any[]) : [];
    const vids = Array.isArray(verifications?.videos) ? (verifications!.videos as any[]) : [];
    return docs.length > 0 || vids.length > 0;
  }, [verifications]);

  useEffect(() => {
    const fetchAmenitiesData = async () => {
      try {
        const amenitiesData = await getAmenities();
        setAmenities(amenitiesData);
      } catch { }
    };
    const fetchAddonsData = async () => {
      try {
        const addonsData = await getAddons();
        setAddons(addonsData);
      } catch { }
    };
    fetchAmenitiesData();
    fetchAddonsData();
  }, []);

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
      price: 1,
      title: "",
      description: "",
      addons: [],
    },
  });

  const category = watch("category");
  const location = watch("location");
  const actualLocation = watch("actualLocation");
  const imageSrc = watch("imageSrc");

  const setCustomValue = useCallback(
    (id: string, value: any) => {
      setValue(id, value, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [setValue]
  );

  const onBack = () => setStep((v) => v - 1);

  const onNext = () => {
    if (step === STEPS.CATEGORY && !category) {
      toast.error("Please Select a Category", { toastId: "Category" });
      return;
    }
    if (step === STEPS.LOCATION && !location) {
      toast.error("Please Add the Location", { toastId: "Location" });
      return;
    }
    if (step === STEPS.IMAGES && (!imageSrc || imageSrc.length === 0)) {
      toast.error("Please upload at least one image", {
        toastId: "ImageUpload",
      });
      return;
    }
    if (step === STEPS.OTHERDETAILS) {
      const d = listingDetails;
      const missing = !d || !d.carpetArea || !d.operationalDays?.start || !d.operationalDays?.end || !d.operationalHours?.start || !d.operationalHours?.end || !d.minimumBookingHours || !d.maximumPax || !Array.isArray(d.type) || d.type.length === 0;
      if (missing) {
        toast.error("Please complete all 'Other details' fields", { toastId: "Other_Details_Missing" });
        return;
      }
    }
    if (step === STEPS.PACKAGES) {
      const invalid = packages.some(
        (pkg) => !pkg?.title || !pkg?.offeredPrice || !pkg?.durationHours
      );
      if (invalid) {
        toast.error("Please complete all package details", { toastId: "Incomplete_Package" });
        return;
      }
    }
    if (step === STEPS.VERIFICATION) {
      if (!hasVerification) {
        toast.error("Please upload verification documents before continuing", { toastId: "Verification_Step_Missing" });
        return;
      }
    }
    setStep((v) => v + 1);
  };

  const [agreementPdf, setAgreementPdf] = useState<any>(null);
  const termsRef = useRef<any>(null);
  const handleTermsAndConditions = (accept: boolean) => setTerms(accept);
  const handleSignature = (sig: any) => setSignature(sig);
  const handleVerificationChange = (v: any) => {
    setVerifications(v);
  };
  const handleAmenitiesChange = (v: {
    predefined: { [key: string]: boolean };
    custom: string[];
  }) => setSelectedAmenities(v);
  const handleAddonChange = (v: Addon[]) => setSelectedAddons(v);
  const handleDetailsChange = (v: ListingDetails) => setListingDetails(v);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.TERMS) return onNext();

    const selectedAmenityKeys = Object.keys(selectedAmenities.predefined).filter(
      (k) => selectedAmenities.predefined[k]
    );

    const payload = {
      title: data.title,
      description: data.description,
      imageSrc: data.imageSrc,
      category: data.category,
      locationValue: data.location?.value ?? "",
      actualLocation: data.actualLocation,
      price: Number(data.price),
      amenities: selectedAmenityKeys,
      otherAmenities: selectedAmenities.custom,
      addons: selectedAddons,
      carpetArea: listingDetails?.carpetArea ?? null,
      operationalDays: listingDetails?.operationalDays ?? null,
      operationalHours: listingDetails?.operationalHours ?? null,
      minimumBookingHours: listingDetails?.minimumBookingHours ?? null,
      maximumPax: listingDetails?.maximumPax ?? null,
      instantBooking: listingDetails?.instantBooking ?? false,
      type: listingDetails?.type ?? [],
      bookingApprovalCount: listingDetails?.bookingApprovalCount ?? null,
      packages: packages.map((pkg) => ({
        title: pkg.title,
        originalPrice: pkg.originalPrice,
        offeredPrice: pkg.offeredPrice,
        features: pkg.features,
        durationHours: pkg.durationHours,
      })),
      verifications,
      agreementSignature: signature,
      agreementPdf,
      terms,
    };

    if (!payload.locationValue) {
      toast.error("Please select a city/location", {
        toastId: "Location_Missing",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("[RentModal] Creating listing payload:", payload);
      const createRes = await axios.post("/api/listings", payload);
      const created = createRes.data;
      const listingId = created?.id;
      console.log("[RentModal] Listing created:", listingId);
      let mergedVerifications = { ...(verifications || {}) } as any;
      if (listingId && Array.isArray(verifications?.documents) && verifications.documents.length > 0) {
        try {
          const folder = `verifications/${listingId}`;
          const reuploadedDocs: any[] = [];
          for (let i = 0; i < verifications.documents.length; i++) {
            const doc = verifications.documents[i];
            try {
              const publicId = doc?.original_filename ? doc.original_filename.replace(/\.[^/.]+$/, "") : `verification-${i + 1}-${Date.now()}`;
              let file: File | undefined = doc?.file as File | undefined;
              if (!file) {
                const srcUrl = doc?.pdfUrl || doc?.url;
                if (!srcUrl) continue;
                const resp = await fetch(srcUrl);
                const blob = await resp.blob();
                file = new File([blob], `${publicId}.pdf`, { type: "application/pdf" });
              }
              if (!file) continue;
              const signRes = await fetch("/api/cloudinary/sign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paramsToSign: { folder, timestamp: Math.floor(Date.now() / 1000), public_id: publicId } }),
              });
              const sign = await signRes.json();
              if (!signRes.ok || !sign?.signature) throw new Error("Sign failed");
              const cloud = sign.cloud as string;
              const apiKey = sign.apiKey as string;
              const fd = new FormData();
              fd.append("file", file);
              fd.append("folder", folder);
              fd.append("timestamp", String(sign.timestamp));
              fd.append("public_id", publicId);
              fd.append("api_key", apiKey);
              fd.append("signature", sign.signature);
              const upRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: fd });
              const up = await upRes.json();
              if (!upRes.ok) throw new Error(up?.error || "Upload failed");
              reuploadedDocs.push({
                resource_type: "image",
                original_filename: publicId,
                public_id: up.public_id,
                bytes: up.bytes,
                version: up.version,
                url: up.secure_url,
                pdfUrl: up.secure_url,
                format: "pdf",
              });
            } catch (e) {
              console.error("[RentModal] Re-upload doc failed", e);
              reuploadedDocs.push(doc); // fallback preserve original
            }
          }
          mergedVerifications = { ...mergedVerifications, documents: reuploadedDocs };
          const patchRes = await axios.patch(`/api/listings/${listingId}`, { verifications: mergedVerifications });
          console.log("[RentModal] Saved verification docs under listing folder:", patchRes.status);
        } catch (e) {
          console.error("[RentModal] Verification re-upload failed", e);
        }
      }
      if (listingId && signature && terms && termsRef.current?.generateAndUploadPdf) {
        try {
          const meta = await termsRef.current.generateAndUploadPdf(`agreements/${listingId}`);
          setAgreementPdf(meta);
          mergedVerifications = { ...mergedVerifications, agreementPdf: meta };
          const patch2 = await axios.patch(`/api/listings/${listingId}`, { verifications: mergedVerifications });
          console.log("[RentModal] Saved agreement PDF inside verifications:", patch2.status);
        } catch { }
      }
      toast.success("Listing Created!", { toastId: "Listing_Created" });
      router.refresh();
      reset();
      setStep(STEPS.CATEGORY);
      rentModel.onClose();
    } catch {
      toast.error("Something Went Wrong", { toastId: "Listing_Error_1" });
    } finally {
      setIsLoading(false);
    }
  };

  const actionLabel = useMemo(() => {
    if (step === STEPS.TERMS) return "Create";
    if (step === STEPS.OTHERDETAILS) return "Verification";
    return "Next";
  }, [step]);

  const secondActionLabel = useMemo(
    () => (step === STEPS.CATEGORY ? undefined : "Back"),
    [step]
  );

  let bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading
        title="Which of these best describes your place?"
        subtitle="Pick a category"
      />
      <div className="grid grid-cols-2 md-grid-cols-3 gap-3 max-h-[calc(100vh-42vh)] overflow-y-auto pr-2">
        {categories.map((item, index) => (
          <div key={index} className="col-span-1">
            <CategoryInput
              onClick={(c) => setCustomValue("category", c)}
              selected={category === item.label}
              label={item.label}
              icon={item.icon}
            />
          </div>
        ))}
      </div>
    </div>
  );

  const removeImage = (idx: number) => {
    const updated = imageSrc.filter((_: any, i: number) => i !== idx);
    setCustomValue("imageSrc", updated);
  };

  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-4">
        <Heading
          title="Where is your place located?"
          subtitle="Help content creators find you!"
        />
        <CitySelect
          value={location}
          onChange={(v) => setCustomValue("location", v)}
        />
        <AutoComplete
          value={location ? location.display_name : ""}
          onChange={(sel: any) => {
            const latlng = [Number(sel.latlng.lat), Number(sel.latlng.lon)];
            setCustomValue("actualLocation", {
              display_name: sel.display_name,
              latlng,
            });
          }}
        />
        <Map center={actualLocation?.latlng ?? location?.latlng} />
      </div>
    );
  }

  if (step === STEPS.IMAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Add photos of your place"
          subtitle="Show creators what your place looks like!"
        />
        <div className="flex gap-6 w-full flex-wrap justify-center sm:justify-normal mt-2 sm:mt-0">
          {imageSrc.map((item: any, index: number) => (
            <div key={index} className="relative">
              <div className="h-32 w-32 rounded-xl flex items-center">
                <Image
                  src={item}
                  alt={`Image ${index}`}
                  width={128}
                  height={128}
                  className="h-full w-full object-cover rounded-xl"
                />
              </div>
              <button
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 rounded-full"
              />
            </div>
          ))}
          {(!imageSrc || imageSrc.length < 8) && (
            <ImageUpload
              onChange={(v) => setCustomValue("imageSrc", v)}
              values={imageSrc}
            />
          )}
        </div>
      </div>
    );
  }

  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-4">
        <Heading
          title="Your Property Details"
          subtitle="Set an inviting title and subtitle for your property"
        />
        <Input
          id="title"
          label="Title"
          disabled={isLoading}
          register={register("title", { required: "Name of your property" })}
          errors={errors}
          required
        />
        <Input
          id="description"
          label="Description"
          disabled={isLoading}
          register={register("description", {
            required: "Describe your property",
          })}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step === STEPS.PRICE) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Now, set your price"
          subtitle="How much do you charge per hour?"
        />
        <Input
          id="price"
          label="Price"
          formatPrice
          type="number"
          disabled={isLoading}
          register={register("price", {
            required: "Price of your property",
          })}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step === STEPS.AMENITIES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Select the amenities at your property"
          subtitle="Add the amenities available at the shoot space"
        />
        <AmenitiesCheckbox
          amenities={amenities}
          onChange={handleAmenitiesChange}
        />
      </div>
    );
  }

  if (step === STEPS.ADDONS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Select the add-ons, if available at your property"
          subtitle="Additional chargeable services/facilities"
        />
        <AddonsSelection
          addons={addons}
          initialSelectedAddons={selectedAddons}
          onSelectedAddonsChange={handleAddonChange}
        />
        <CustomAddonModal save={(v: any) => setAddons([...addons, v])} />
      </div>
    );
  }

  if (step === STEPS.PACKAGES) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Add Custom Packages"
          subtitle="Create bundles (e.g. studio + photographer + lighting)"
        />
        <PackagesForm value={packages} onChange={setPackages} />
      </div>
    );
  }

  if (step === STEPS.OTHERDETAILS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading title="Other details of the listing" />
        <OtherListingDetails onDetailsChange={handleDetailsChange} />
      </div>
    );
  }

  if (step === STEPS.VERIFICATION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <SpaceVerification onVerification={handleVerificationChange} />
      </div>
    );
  }

  if (step === STEPS.TERMS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <TermsAndConditionsModal ref={termsRef} onChange={handleTermsAndConditions} onSignature={handleSignature} onAgreementPdf={setAgreementPdf} />
      </div>
    );
  }

  return (
    <Modal
      disabled={isLoading || (step === STEPS.TERMS && !(terms && signature))}
      isOpen={rentModel.isOpen}
      title={
        step === STEPS.VERIFICATION
          ? "Space Verification"
          : step === STEPS.TERMS
            ? "TERMS AND CONDITIONS FOR PROPERTY HOSTS"
            : "List Your Space!"
      }
      actionLabel={actionLabel}
      onSubmit={handleSubmit(onSubmit)}
      secondaryActionLabel={secondActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      onClose={rentModel.onClose}
      selfActionButton={false}
      autoWidth={step === STEPS.VERIFICATION || step === STEPS.ADDONS}
      customWidth={step === STEPS.VERIFICATION ? "w-1/2" : ""}
      body={bodyContent}
      verificationBtn={step === STEPS.TERMS}
      fixedHeight={step === STEPS.ADDONS}
      termsAndConditionsAccept={terms}
    />
  );
}

export default RentModal;
