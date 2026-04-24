"use client";

import { Amenities } from "@prisma/client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconType } from "react-icons";

import createReview from "@/app/actions/createReview";
import getAddons from "@/app/actions/getAddons";
import getAmenities from "@/app/actions/getAmenities";
import getReviews from "@/app/actions/getReviews";
import { checkBookingAction } from "@/app/actions/reservationActions";
import Textarea from "@/components/inputs/Textarea";
import AddonsList from "@/components/listing/AddonList";
import ListingCategory from "@/components/listing/ListingCategory";
import PackageList from "@/components/listing/PackageList";
import SetSelector from "@/components/listing/SetSelector";
import Offers from "@/components/Offers";
import Avatar from "@/components/ui/Avatar";
import Heading from "@/components/ui/Heading";
import Pill from "@/components/ui/Pill";
import SafeHtml from "@/components/ui/SafeHtml";
import StarRating from "@/components/ui/StarRating";
import useCities from "@/hooks/useCities";
import { getPlainTextFromHTML, isRichTextEmpty } from "@/lib/richText";
import { formatISTDate } from "@/lib/utils";
import { Addon } from "@/types/addon";
import { FullListing } from "@/types/listing";
import { Package } from "@/types/package";
import { SafeUser } from "@/types/user";

const Map = dynamic(() => import("../Map"), { ssr: false });

interface Review {
  id: string;
  comment: string;
  createdAt: string | Date;
  user: {
    name: string | null;
    image: string | null;
  };
}

type Props = {
  user: SafeUser;
  description: string;
  category:
  | {
    icon: IconType;
    label: string;
    description: string;
  }
  | undefined;
  locationValue: string;
  fullListing: FullListing;
  definedAmenities?: Amenities[];
  onAddonChange: (addons: Addon[]) => void;
  services: string[];
  onPackageSelect?: (pkg: Package | null) => void;


  selectedSetIds?: string[];
  onSetToggle?: (setId: string) => void;
  onSelectAllSets?: () => void;
  availableSetIds?: string[];
  isEntireStudioBooked?: boolean;
  setPricingType?: "FIXED" | "HOURLY" | null;
  setHours?: number;
  includedSetId?: string | null;
  selectedPackage?: Package | null;
  isSetSelectionDisabled?: boolean;

  processedDescription?: string | null;
  processedTerms?: string | null;
  descriptionShouldTruncate?: boolean;
};

function ListingInfo({
  user,
  description,
  category,
  locationValue,
  fullListing,
  definedAmenities,
  onAddonChange,
  onPackageSelect,

  selectedSetIds = [],
  onSetToggle,
  onSelectAllSets,
  availableSetIds = [],
  isEntireStudioBooked = false,
  setPricingType = null,
  setHours = 1,
  includedSetId = null,
  selectedPackage = null,
  isSetSelectionDisabled = false,
  processedDescription,
  processedTerms,
  descriptionShouldTruncate
}: Props) {
  const { getByValue } = useCities();
  const coordinates = getByValue(locationValue)?.latlng;

  const getValidCenter = useCallback((): number[] | undefined => {
    // Prefer privacy-safe jittered latlng if available
    if (
      fullListing.actualLocation &&
      Array.isArray(fullListing.actualLocation.latlng) &&
      fullListing.actualLocation.latlng.length >= 2 &&
      typeof fullListing.actualLocation.latlng[0] === 'number' &&
      typeof fullListing.actualLocation.latlng[1] === 'number' &&
      Number.isFinite(fullListing.actualLocation.latlng[0]) &&
      Number.isFinite(fullListing.actualLocation.latlng[1])
    ) {
      return [fullListing.actualLocation.latlng[0], fullListing.actualLocation.latlng[1]];
    }

    // Fallback to exact lat/lng (for legacy listings before jittering was introduced)
    if (fullListing.actualLocation &&
      typeof fullListing.actualLocation.lat === 'number' &&
      typeof fullListing.actualLocation.lng === 'number' &&
      Number.isFinite(fullListing.actualLocation.lat) &&
      Number.isFinite(fullListing.actualLocation.lng)) {
      return [fullListing.actualLocation.lat, fullListing.actualLocation.lng];
    }

    // Fallback to coordinates based on locationValue string
    if (Array.isArray(coordinates) &&
      coordinates.length >= 2 &&
      typeof coordinates[0] === 'number' &&
      typeof coordinates[1] === 'number' &&
      Number.isFinite(coordinates[0]) &&
      Number.isFinite(coordinates[1])) {
      return [coordinates[0], coordinates[1]];
    }
    return undefined;
  }, [fullListing.actualLocation, coordinates]);

  const relayAddons = useCallback((addons: Addon[]) => onAddonChange(addons), [onAddonChange]);

  const [addonList, setAddonList] = useState<Addon[]>([]);
  const [amenityDefs, setAmenityDefs] = useState<Amenities[]>(definedAmenities ?? []);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [latestReservationId, setLatestReservationId] = useState("");
  const [review, setReview] = useState({ rating: 5, comment: "" });
  const [isExpanded, setIsExpanded] = useState(false);
  const toggleExpand = () => setIsExpanded((prev) => !prev);

  const shouldTruncate = useMemo(() => {
    if (descriptionShouldTruncate !== undefined) return descriptionShouldTruncate;
    return getPlainTextFromHTML(description, 0).length > 250;
  }, [description, descriptionShouldTruncate]);

  useEffect(() => {
    const fetchData = async () => {
      const list = await getAddons();
      setAddonList(list || []);
      try {
        const data = await getReviews(fullListing.id);
        setReviews(data || []);
      } catch (error: unknown) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[ListingInfo] Error fetching reviews:', error);
        }
      }
    };
    const checkBookingStatus = async () => {
      try {
        const res = await checkBookingAction(fullListing.id);
        const reservation = res.data;
        if (reservation) {
          setCanReview(Boolean(reservation.status === "PAID"));
          setLatestReservationId(reservation.id ?? "");
        } else {
          setCanReview(false);
        }
      } catch (error) {
        console.error('[ListingInfo] Error checking booking:', error);
        setCanReview(false);
      }
    };
    fetchData();
    checkBookingStatus();
  }, [fullListing.id]);

  useEffect(() => {
    if (definedAmenities && definedAmenities.length > 0) {
      setAmenityDefs(definedAmenities);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const defs = await getAmenities();
        if (!cancelled) setAmenityDefs(defs || []);
      } catch {
        if (!cancelled) setAmenityDefs([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [definedAmenities]);

  const normalizeSelectedAmenityKeys = useCallback((raw: unknown): string[] => {
    try {
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if ((trimmed.startsWith("[") && trimmed.endsWith("]")) || (trimmed.startsWith("{") && trimmed.endsWith("}"))) {
          raw = JSON.parse(trimmed);
        }
      }
    } catch { }
    const out: string[] = [];
    const pushKey = (k: unknown) => {
      if (k == null) return;
      const s = String(k).trim();
      if (!s) return;
      out.push(s);
    };
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (typeof item === "string") pushKey(item);
        else if (item && typeof item === "object") {
          const obj = item as Record<string, unknown>;
          pushKey(obj.key ?? obj.slug ?? obj.name ?? obj.id);
        }
      });
    } else if (raw && typeof raw === "object") {
      Object.entries(raw).forEach(([k, v]) => {
        if (v) pushKey(k);
      });
    }
    return Array.from(new Set(out));
  }, []);

  const selectedAmenityKeys = useMemo(
    () => normalizeSelectedAmenityKeys(fullListing?.amenities ?? []),
    [fullListing?.amenities, normalizeSelectedAmenityKeys]
  );


  const transformedAmenityDefs = useMemo(() => {
    return amenityDefs.map((amenity) => ({
      id: amenity.id,
      name: amenity.name,
      icon: typeof amenity.icon === "string" ? amenity.icon : amenity.icon == null ? null : String(amenity.icon),
      createdAt: amenity.createdAt,
    }));
  }, [amenityDefs]);

  const opDaysStart = fullListing?.operationalDays?.start ?? "";
  const opDaysEnd = fullListing?.operationalDays?.end ?? "";
  const opHoursStart = fullListing?.operationalHours?.start ?? "";
  const opHoursEnd = fullListing?.operationalHours?.end ?? "";
  const carpetArea = fullListing?.carpetArea ?? "";
  const maximumPax = fullListing?.maximumPax ?? 0;
  const minimumBookingHours = fullListing?.minimumBookingHours ?? "";
  const type = Array.isArray(fullListing?.type) ? fullListing.type : [];

  const handleReviewSubmit = async () => {
    try {
      await createReview({
        listingId: fullListing.id,
        reservationId: latestReservationId,
        rating: review.rating,
        comment: review.comment,
      });
      const data = await getReviews(fullListing.id);
      setReviews(data || []);
      setReview({ rating: 5, comment: "" });
    } catch (error) {
      console.error('[ListingInfo] Error submitting review:', error);
    }
  };

  return (
    <div className="col-span-4 flex flex-col gap-8">
      <div className="flex gap-2 justify-between items-start">
        <div className="text-xl font-semibold flex flex-row items-center gap-3">
          <Avatar src={user?.image} size={40} />
          <Heading title={`Hosted by ${user?.name}`} variant="h6" />
        </div>
        {fullListing.avgReviewRating && fullListing.avgReviewRating !== 0 && (
          <StarRating
            rating={fullListing.avgReviewRating}
            size={20}
            activeColor="text-warning"
            showText
          />
        )}
      </div>

      <hr />


      {fullListing.hasSets && fullListing.sets && fullListing.sets.length > 0 && (
        <>
          <SetSelector
            sets={fullListing.sets}
            selectedSetIds={selectedSetIds}
            onSetToggle={onSetToggle || (() => { })}
            onSelectAll={onSelectAllSets}
            includedSetId={includedSetId}
            pricingType={setPricingType}
            hours={setHours}
            disabled={isSetSelectionDisabled}
            selectedPackage={selectedPackage}
            availableSetIds={availableSetIds}
            isEntireStudioBooked={isEntireStudioBooked}
          />
          <hr />
        </>
      )}

      {category && (
        <ListingCategory
          icon={category.icon}
          label={category.label}
          description={category.description}
        />
      )}

      <div className="text-base font-normal">
        <SafeHtml
          html={processedDescription || description || ""}
          className={!isExpanded ? "max-h-40 overflow-hidden relative" : ""}
        />

        {shouldTruncate && (
          <button
            onClick={toggleExpand}
            className="underline font-medium text-sm mt-1 cursor-pointer"
            type="button"
          >
            {isExpanded ? "See less" : "See more"}
          </button>
        )}
      </div>

      <hr />

      {(selectedAmenityKeys.length > 0 || (fullListing.otherAmenities?.length ?? 0) > 0) && (
        <>
          <Offers
            amenities={selectedAmenityKeys}
            definedAmenities={transformedAmenityDefs}
            customAmenities={fullListing.otherAmenities ?? []}
          />
          <hr />
        </>
      )}

      {Array.isArray(fullListing.addons) && fullListing.addons.length > 0 && (
        <>
          <AddonsList addons={fullListing.addons} onChange={relayAddons} addonList={addonList} />
          <hr />
        </>
      )}

      {Array.isArray(fullListing.packages) && fullListing.packages.length > 0 && (
        <>
          <PackageList
            packages={fullListing.packages}
            onSelect={(pkg) => {
              onPackageSelect?.(pkg ?? null);
            }}
            selectedPackageId={selectedPackage?.id}
            isMultiSets={fullListing.hasSets}
          />
          <hr />
        </>
      )}

      <div className="flex flex-col gap-4">
        <Heading title="Where you'll be" variant="h5" />
        <Map center={getValidCenter() as [number, number] | undefined} />
      </div>

      <hr />

      <div className="flex flex-col gap-4">
        <Heading title="Operational Timings" variant="h5" />
        <div className="flex gap-10">
          {(opDaysStart || opDaysEnd) && (
            <div>
              <strong>
                {opDaysStart} {opDaysStart && opDaysEnd && "-"} {opDaysEnd}
              </strong>
            </div>
          )}
          {(opHoursStart || opHoursEnd) && (
            <div>
              {opHoursStart} {opHoursStart && opHoursEnd && "-"} {opHoursEnd}
            </div>
          )}
        </div>
      </div>

      <hr />

      <div className="flex flex-col gap-4">
        <Heading title="Additional Information" variant="h5" />
        {(carpetArea || carpetArea === 0) && (
          <div className="flex gap-10">
            <div className="w-1/2">
              <strong>Carpet Area</strong>
            </div>
            <div>{carpetArea || 0} sqft</div>
          </div>
        )}
        {(maximumPax || maximumPax === 0) && (
          <div className="flex gap-10">
            <div className="w-1/2">
              <strong>Max People</strong>
            </div>
            <div>{maximumPax} People</div>
          </div>
        )}
        {(minimumBookingHours || minimumBookingHours === 0) && (
          <div className="flex gap-10">
            <div className="w-1/2">
              <strong>Min Booking Hours</strong>
            </div>
            <div>{minimumBookingHours || 0} Hrs</div>
          </div>
        )}
      </div>

      <hr />

      <div className="flex flex-col gap-4">
        <Heading title="Listed Services" variant="h5" />
        <div className="flex flex-wrap gap-2">
          {type.map((service: string, index: number) => (
            <Pill
              key={index}
              label={service}
              variant="secondary"
              size="sm"
            />
          ))}
          <p className="text-muted-foreground mt-3">
            <strong className="text-foreground">Note:</strong> Please utilize this space for its intended activities to make the most of your experience.
          </p>
        </div>
      </div>

      <hr />

      {(reviews.length > 0 || canReview) && (
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <Heading title="Reviews" variant="h5" />
            <div className="text-lg font-semibold flex items-center gap-1.5">
              <span className="text-2xl">{reviews.length}</span>
              <span className="text-muted-foreground text-sm font-medium uppercase tracking-wider">Ratings</span>
            </div>
          </div>

          {reviews.length > 0 && (
            <>
              <div className="flex flex-col relative gap-4 pb-4">
                {reviews.map((rv) => (
                  <div className="flex items-center p-5  rounded-2xl border" key={rv.id}>
                    <div className="h-fit">
                      <Avatar src={rv.user?.image} size={45} />
                    </div>
                    <div className="pl-4 flex flex-col w-full">
                      <div className="flex justify-between items-center">
                        <div className="text-base font-bold">{rv.user?.name}</div>
                      </div>
                      <div>
                        <p>{rv.comment}</p>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatISTDate(rv.createdAt, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <hr />
            </>
          )}

          {canReview && (
            <>
              <div className="flex flex-col gap-4">
                <Heading title="Submit your review" variant="h5" className="capitalize" />
                <div className="relative">
                  <div className="text-sm font-bold mb-2">Write your message</div>
                  <div className="flex w-full bg-background border border-border items-end px-2 py-2 rounded-xl">
                    <Textarea
                      id="review-comment"
                      value={review.comment}
                      onChange={(e) => setReview({ ...review, comment: e.target.value })}
                      className="min-h-30 border-0 focus:ring-0 p-0"
                      placeholder="Write your message"
                    />
                    <div className="w-4 h-4">
                      <Image src="/assets/edit.svg" height={18} width={18} className="w-full h-full object-contain" alt="Edit review" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="font-semibold">Rate</span>
                  <StarRating
                    interactive
                    rating={review.rating}
                    onRate={(v) => setReview({ ...review, rating: v })}
                    size={24}
                    activeColor="text-warning"
                    inactiveColor="text-muted-foreground"
                  />
                </div>
                <button type="button" onClick={handleReviewSubmit} className="rounded-full bg-foreground w-full py-2.5 text-background hover:opacity-90 cursor-pointer">
                  Submit
                </button>
              </div>
              <hr />
            </>
          )}
        </div>
      )}

      {!isRichTextEmpty(fullListing.customTerms) && (
        <>
          <div className="flex flex-col gap-4">
            <Heading title="Terms & Conditions by Host" variant="h5" />
            <SafeHtml
              html={processedTerms || fullListing.customTerms || ""}
            />
          </div>
          <hr />
        </>
      )}

      <div className="flex flex-col gap-4">
        <Heading title="Cancellation Policy" variant="h5" />
        <p className="flex flex-wrap">
          Full refund for cancellations made at least 72 hours before the scheduled booking, partial refund for cancellations made
          between 24 and 72 hours before the scheduled booking, and no refund for cancellations made within 24 hours of the scheduled booking.
        </p>

        <Link href="/cancellation" className="text-foreground font-semibold underline cursor-pointer w-fit">
          Know more about Cancellation Policy
        </Link>

      </div>
    </div>
  );
}

export default ListingInfo;

