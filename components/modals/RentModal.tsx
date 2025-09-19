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
import CustomAddonModal from "./CustomAddonModal";
import AutoComplete from "../inputs/AutoComplete";
import PackagesForm, { Package } from "../inputs/PackagesForm";

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
  const [addons, setAddons] = useState<any[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<{
    predefined: { [key: string]: boolean };
    custom: string[];
  }>({ predefined: {}, custom: [] });
  const [selectedAddons, setSelectedAddons] = useState<Addon[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const Map = useMemo(() => dynamic(() => import("../Map"), { ssr: false }), []);

  useEffect(() => {
    const fetchAmenitiesData = async () => {
      try {
        const amenitiesData = await getAmenities();
        setAmenities(amenitiesData);
      } catch {}
    };
    const fetchAddonsData = async () => {
      try {
        const addonsData = await getAddons();
        setAddons(addonsData);
      } catch {}
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
    setStep((v) => v + 1);
  };

  const handleTermsAndConditions = (accept: boolean) => setTerms(accept);
  const handleVerificationChange = (v: any) => setVerifications(v);
  const handleAmenitiesChange = (v: {
    predefined: { [key: string]: boolean };
    custom: string[];
  }) => setSelectedAmenities(v);
  const handleAddonChange = (v: Addon[]) => setSelectedAddons(v);
  const handleDetailsChange = (v: ListingDetails) => setListingDetails(v);

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (step !== STEPS.TERMS) return onNext();
    if (
      packages.some(
        (pkg) =>
          !pkg.title || !pkg.offeredPrice || !pkg.durationHours
      )
    ) {
      toast.error("Please complete all package details", {
        toastId: "Incomplete_Package",
      });
      return;
    }

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
      await axios.post("/api/listings", payload);
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
                <img
                  src={item}
                  alt={`Image ${index}`}
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
        <TermsAndConditionsModal onChange={handleTermsAndConditions} />
      </div>
    );
  }

  return (
    <Modal
      disabled={isLoading}
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
