"use client";

import useRentModal from "@/hook/useRentModal";
import axios from "axios";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
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
import { Addons, Amenities, CustomAmenities } from '@prisma/client';
import getAddons from "@/app/actions/getAddons";
import AddonsSelection, { Addon } from "../inputs/AddonsSelection";
import OtherListingDetails, { ListingDetails } from "../inputs/OtherListingDetails";
import SpaceVerification from "../inputs/SpaceVerification";
import TermsAndConditionsModal from "../inputs/TermsAndConditions";
import CustomAddonModal from "./CustomAddonModal";
import AutoComplete from "../inputs/AutoComlete";

type Props = {};

enum STEPS {
  CATEGORY = 0,
  LOCATION = 1,
  IMAGES = 2,
  DESCRIPTION = 3,
  PRICE = 4,
  AMENITIES = 5,
  ADDONS = 6,
  OTHERDETAILS = 7,
  VERIFICATION = 8,
  TERMS = 9
}

function RentModal({ }: Props) {
  const router = useRouter();
  const rentModel = useRentModal();
  const [step, setStep] = useState(STEPS.CATEGORY);
  const [isLoading, setIsLoading] = useState(false);
  const [amenities, setAmenities] = useState<Amenities[]>([]);  // Explicitly specify the type
  const [listingDetails, setListigDetails] = useState<ListingDetails>();  // Explicitly specify the type

  const [customAmenities, setCustomAmenities] = useState<CustomAmenities[]>([]);  // Explicitly specify the type

  const [verifications, setVerifications] = useState();
  const [terms, setTerms] = useState(Boolean);
  const [addons, setAddons] = useState<any[]>([]);  // Explicitly specify the type

  const [selectedAmenities, setSelectedAmenities] = useState<{ [key: string]: boolean }>({});
  const [selectedAddons, setSelectedAddons] = useState<{}>({});

  const handleTermsAndConditions = (accept: any) => {
    setTerms(accept);
  };

  const handleVerificationChange = (verifications: any) => {
    setVerifications(verifications);
  };
  const handleAmenitiesChange = (updatedAmenities: { [key: string]: boolean }) => {
    setSelectedAmenities(updatedAmenities);
  };
  const handleAddonChange = (updatedAddons: Addon[]) => {
    setSelectedAddons(updatedAddons);
  };
  const handleDetailsChange = (newDetails: ListingDetails) => {
    // Handle the updated details here, e.g., set state or pass up further
    setListigDetails(newDetails)
  };
  useEffect(() => {

    // Fetch amenities data
    const fetchAmenitiesData = async () => {
      try {
        const amenitiesData = await getAmenities();
        setAmenities(amenitiesData);
      } catch (error) {
        console.error('Error fetching amenities:', error);
      }
    };

    fetchAmenitiesData();
    const fetchAddonsData = async () => {
      try {
        const addonsData = await getAddons();
        setAddons(addonsData);
      } catch (error) {
        console.error('Error fetching amenities:', error);
      }
    };

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
      amenities: [],
      addons: []
    },
  });

  const category = watch("category");
  const location = watch("location");
  const actualLocation = watch("actualLocation");

  const imageSrc = watch("imageSrc");

  const Map = useMemo(
    () =>
      dynamic(() => import("../Map"), {
        ssr: false,
      }),
    [location]
  );

  const setCustomValue = (id: string, value: any) => {
    setValue(id, value, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  };

  const onBack = () => {
    setStep((value) => value - 1);
  };

  const onNext = () => {
    if (step === STEPS.CATEGORY && !category) {
      toast.error("Please Select a Category", {
        toastId: "Category"
      });
      return;
    }
    if (step === STEPS.LOCATION && !location) {
      toast.error("Please Add the Location", {
        toastId: "Location"
      });
      return;
    }

    // if (step === STEPS.IMAGES && (!imageSrc || imageSrc.length === 0)) {
    //   toast.error("Please Upload an Image", {
    //     toastId: "Image"
    //   });
    //   return;
    // }
    setStep((value) => value + 1);
  };

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    if (step !== STEPS.TERMS) {
      return onNext();
    }
    data.amenities = Object.keys(selectedAmenities).filter((key) => selectedAmenities[key]),
      data.addons = selectedAddons;
    data.otherDetails = listingDetails;
    data.verifications = verifications;
    data.terms = terms;

    setIsLoading(true);

    axios
      .post("/api/listings", data)
      .then(() => {
        toast.success("Listing Created!", {
          toastId: "Listing_Created"
        });
        router.refresh();
        reset();
        setStep(STEPS.CATEGORY);
        rentModel.onClose();

      })
      .catch(() => {
        toast.error("Something Went Wrong", {
          toastId: "Listing_Error_1"
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const actionLabel = useMemo(() => {
    if (step === STEPS.OTHERDETAILS) {
      return "Verification";
    }

    return "Next";
  }, [step]);

  const secondActionLabel = useMemo(() => {
    if (step === STEPS.CATEGORY) {
      return undefined;
    }

    return "Back";
  }, [step]);

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
              onClick={(category) => setCustomValue("category", category)}
              selected={category === item.label}
              label={item.label}
              icon={item.icon}
            />
          </div>
        ))}
      </div>
    </div>
  );

  if (step === STEPS.LOCATION) {
    bodyContent = (
      <div className="flex flex-col gap-4">
        <Heading
          title="Where is your place located?"
          subtitle="Help content creators find you!"
        />
        <CitySelect
          value={location}
          onChange={(value) => setCustomValue("location", value)}
        />
        <AutoComplete
          value={location ? location.display_name : ''}
          onChange={(selected: any) => {
            const latlng = [
              selected.latlng.lat,
              selected.latlng.lon
            ];
            setCustomValue("actualLocation", { display_name: selected.display_name, latlng: latlng });
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
        <ImageUpload
          onChange={(value) => setCustomValue("imageSrc", value)}
          values={imageSrc}
        />
      </div>
    );
  }


  if (step === STEPS.DESCRIPTION) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Your Property Details"
          subtitle="Set an inviting title and subtitle for your property"
        />
        <Input
          id="title"
          label="Title"
          disabled={isLoading}
          register={register("title", {
            required: "Name of your property",
          })}
          errors={errors}
          required
        />
        <hr />
        <Input
          id="description"
          label="Description"
          disabled={isLoading}
          register={register("Description", {
            required: "Describe your property",
          })}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step == STEPS.PRICE) {
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
          register={register("Price", {
            required: "Price of your property",
          })}
          errors={errors}
          required
        />
      </div>
    );
  }

  if (step == STEPS.AMENITIES) {

    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Select the amenities at your property"
          subtitle="Add the amenities available at the shoot space"
        />
        <AmenitiesCheckbox amenities={amenities} onChange={handleAmenitiesChange}></AmenitiesCheckbox>
      </div>
    );
  }

  if (step == STEPS.ADDONS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Select the add-ons, if available at your property"
          subtitle="Additonal chargeable services/facilities"
        />
        <AddonsSelection addons={addons} initialSelectedAddons={[]} onSelectedAddonsChange={handleAddonChange}></AddonsSelection>
        <CustomAddonModal save={(value: any) => { addons.push(value); setAddons(addons) }} />

      </div>
    );
  }

  if (step == STEPS.OTHERDETAILS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <Heading
          title="Other details of the listing"
        />
        <OtherListingDetails onDetailsChange={handleDetailsChange}></OtherListingDetails>
      </div>
    );
  }
  if (step == STEPS.VERIFICATION) {
    bodyContent = (
      <div className="flex flex-col gap-8">

        <SpaceVerification onVerification={handleVerificationChange}></SpaceVerification>
        {/*  <UserVerification  onSubmit={handleSubmit(onSubmit)}></UserVerification> */}
      </div>
    );
  }
  if (step == STEPS.TERMS) {
    bodyContent = (
      <div className="flex flex-col gap-8">
        <TermsAndConditionsModal onChange={handleTermsAndConditions}></TermsAndConditionsModal>
        {/*  <UserVerification  onSubmit={handleSubmit(onSubmit)}></UserVerification> */}
      </div>
    );
  }
  return (
    <Modal
      disabled={isLoading}
      isOpen={rentModel.isOpen}
      title={step == STEPS.VERIFICATION ? "Space Verification" : step == STEPS.TERMS ? "TERMS AND CONDITIONS FOR PROPERTY HOSTS" : "List Your Space!"}
      actionLabel={actionLabel}
      onSubmit={handleSubmit(onSubmit)}
      secondaryActionLabel={secondActionLabel}
      secondaryAction={step === STEPS.CATEGORY ? undefined : onBack}
      onClose={rentModel.onClose}
      selfActionButton={false}
      autoWidth={step === STEPS.VERIFICATION ? true : false}
      customWidth={step === STEPS.VERIFICATION ? 'w-1/2' : ''}
      body={bodyContent}
      verificationBtn={step === STEPS.TERMS}
      fixedHeight={step == STEPS.ADDONS ? true : false}
      termsAndConditionsAccept={terms}
    />
  );
}

export default RentModal;
