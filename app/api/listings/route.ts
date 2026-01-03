import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

const JITTER_METERS = 250;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const jitterLatLng = (latlng: unknown): [number, number] | null => {
  if (!Array.isArray(latlng) || latlng.length < 2) return null;
  const lat = Number(latlng[0]);
  const lng = Number(latlng[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const r = JITTER_METERS / 111320;
  const u = Math.random();
  const v = Math.random();
  const w = r * Math.sqrt(-2 * Math.log(u));
  const t = 2 * Math.PI * v;
  const dLat = w * Math.cos(t);
  const dLng = w * Math.sin(t) / Math.cos((lat * Math.PI) / 180);
  const jLat = clamp(lat + dLat, -90, 90);
  const jLng = clamp(lng + dLng, -180, 180);
  return [jLat, jLng];
};

type PackageInput = {
  title: unknown;
  originalPrice?: unknown;
  offeredPrice: unknown;
  features?: unknown;
  durationHours: unknown;
};

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Authentication required", 401);
    }

    if (!currentUser.is_owner) {
      return createErrorResponse("Only owners can create listings", 403);
    }

    const body = await request.json().catch(() => ({}));
    const {
      title, description, imageSrc, category, locationValue, actualLocation,
      price, amenities, otherAmenities, addons, carpetArea, operationalDays,
      operationalHours, minimumBookingHours, maximumPax, instantBooking, type,
      verifications, terms, packages,
    } = body;

    if (!title || typeof title !== "string") {
      return createErrorResponse("title is required and must be a string", 400);
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 5) {
      return createErrorResponse("title must be at least 5 characters long", 400);
    }
    if (trimmedTitle.length > 200) {
      return createErrorResponse("title is too long (max 200 characters)", 400);
    }

    if (!description || typeof description !== "string") {
      return createErrorResponse("description is required and must be a string", 400);
    }

    const trimmedDescription = description.trim();
    if (trimmedDescription.length < 50) {
      return createErrorResponse("description must be at least 50 characters long", 400);
    }
    if (trimmedDescription.length > 5000) {
      return createErrorResponse("description is too long (max 5000 characters)", 400);
    }

    if (!imageSrc || !Array.isArray(imageSrc)) {
      return createErrorResponse("imageSrc is required and must be an array", 400);
    }

    if (imageSrc.length === 0) {
      return createErrorResponse("At least one image is required", 400);
    }

    if (imageSrc.length > 20) {
      return createErrorResponse("Maximum 20 images allowed", 400);
    }

    if (!imageSrc.every((img: unknown) => typeof img === "string" && img.trim().length > 0 && img.length <= 500)) {
      return createErrorResponse("All image URLs must be valid strings (max 500 characters)", 400);
    }

    if (!category || typeof category !== "string") {
      return createErrorResponse("category is required and must be a string", 400);
    }

    if (category.trim().length === 0 || category.length > 100) {
      return createErrorResponse("category must be between 1 and 100 characters", 400);
    }

    if (!locationValue || typeof locationValue !== "string") {
      return createErrorResponse("locationValue is required and must be a string", 400);
    }

    if (locationValue.trim().length === 0 || locationValue.length > 200) {
      return createErrorResponse("locationValue must be between 1 and 200 characters", 400);
    }

    if (price == null || typeof price !== "number" || !Number.isFinite(price)) {
      return createErrorResponse("price is required and must be a number", 400);
    }

    const priceValue = Math.round(Number(price));
    if (priceValue < 0) {
      return createErrorResponse("price must be non-negative", 400);
    }
    if (priceValue > 10000000) {
      return createErrorResponse("price exceeds maximum limit (₹10,000,000)", 400);
    }

    if (!actualLocation || typeof actualLocation !== "object" || actualLocation === null) {
      return createErrorResponse("Accurate location details are required", 400);
    }

    const privacySafeLatLng = jitterLatLng((actualLocation as { latlng?: unknown }).latlng);
    if (!privacySafeLatLng) {
      return createErrorResponse("Please select a valid location using autocomplete", 400);
    }

    const finalActualLocation = {
      ...actualLocation,
      latlng: privacySafeLatLng,
    };

    const sanitizedAmenities = Array.isArray(amenities)
      ? amenities.filter((a: unknown) => typeof a === "string" && a.trim().length > 0).slice(0, 50)
      : [];

    const sanitizedOtherAmenities = Array.isArray(otherAmenities)
      ? otherAmenities.filter((a: unknown) => typeof a === "string" && a.trim().length > 0).slice(0, 50)
      : [];

    const sanitizedType = Array.isArray(type)
      ? type.filter((t: unknown) => typeof t === "string" && t.trim().length > 0 && t.trim().length <= 100).slice(0, 20)
      : [];

    const listing = await prisma.listing.create({
      data: {
        title: trimmedTitle,
        description: trimmedDescription,
        imageSrc: imageSrc.map((img: string) => img.trim()),
        category: category.trim(),
        locationValue: locationValue.trim(),
        actualLocation: finalActualLocation,
        price: priceValue,
        userId: currentUser.id,
        amenities: sanitizedAmenities,
        otherAmenities: sanitizedOtherAmenities,
        addons: addons || null,
        carpetArea: carpetArea || null,
        operationalDays: operationalDays || null,
        operationalHours: operationalHours || null,
        minimumBookingHours: minimumBookingHours || null,
        maximumPax: maximumPax || null,
        instantBooking: Boolean(instantBooking),
        type: sanitizedType,
        verifications: verifications || null,
        terms: Boolean(terms),
        status: "PENDING",
        active: false,
      },
    });

    if (Array.isArray(packages) && packages.length > 0) {
      if (packages.length > 20) {
        return createErrorResponse("Maximum 20 packages allowed per listing", 400);
      }

      const packageData = packages.map((p: PackageInput, index: number) => {
        if (!p.title || typeof p.title !== "string") {
          throw new Error(`Package ${index + 1}: title is required and must be a string`);
        }

        const pTitle = String(p.title).trim();
        if (pTitle.length < 3 || pTitle.length > 200) {
          throw new Error(`Package ${index + 1}: title must be between 3 and 200 characters`);
        }

        if (typeof p.offeredPrice !== "number" || !Number.isFinite(p.offeredPrice) || p.offeredPrice < 0) {
          throw new Error(`Package ${index + 1}: offeredPrice must be a non-negative number`);
        }

        if (p.offeredPrice > 10000000) {
          throw new Error(`Package ${index + 1}: offeredPrice exceeds maximum limit`);
        }

        const pOriginalPrice = p.originalPrice != null && typeof p.originalPrice === "number" && Number.isFinite(p.originalPrice) && p.originalPrice >= 0
          ? p.originalPrice
          : 0;

        if (pOriginalPrice > 0 && p.offeredPrice > pOriginalPrice) {
          throw new Error(`Package ${index + 1}: offeredPrice cannot be greater than originalPrice`);
        }

        if (typeof p.durationHours !== "number" || !Number.isFinite(p.durationHours) || p.durationHours <= 0) {
          throw new Error(`Package ${index + 1}: durationHours must be a positive number`);
        }

        if (p.durationHours > 168) {
          throw new Error(`Package ${index + 1}: durationHours cannot exceed 168 hours`);
        }

        const pFeatures = Array.isArray(p.features)
          ? p.features
            .filter((f: unknown) => typeof f === "string")
            .map((f: string) => f.trim())
            .filter((f: string) => f.length > 0 && f.length <= 200)
            .slice(0, 20)
          : [];

        return {
          title: pTitle,
          originalPrice: Math.round(pOriginalPrice),
          offeredPrice: Math.round(p.offeredPrice),
          features: pFeatures,
          durationHours: Math.round(p.durationHours),
          listingId: listing.id,
        };
      });

      await prisma.package.createMany({
        data: packageData,
      });
    }

    const withPackages = await prisma.listing.findUnique({
      where: { id: listing.id },
      include: { packages: true },
    });

    return createSuccessResponse(withPackages, 201, "Listing created successfully");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Package")) {
      return createErrorResponse(error.message, 400);
    }
    return handleRouteError(error, "POST /api/listings");
  }
}
