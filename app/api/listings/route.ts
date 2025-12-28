import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

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
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createErrorResponse("Authentication required", 401);
    }

    const body = await request.json();
    const {
      title, description, imageSrc, category, locationValue, actualLocation,
      price, amenities, otherAmenities, addons, carpetArea, operationalDays,
      operationalHours, minimumBookingHours, maximumPax, instantBooking, type,
      verifications, terms, packages,
    } = body;

    if (!title || !description || !imageSrc || !category || !locationValue || price == null) {
      return createErrorResponse("Missing required fields: title, description, imageSrc, category, locationValue, or price", 400);
    }

    if (!actualLocation || typeof actualLocation !== "object") {
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

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        imageSrc,
        category,
        locationValue,
        actualLocation: finalActualLocation,
        price: Number(price),
        userId: currentUser.id,
        amenities,
        otherAmenities,
        addons,
        carpetArea,
        operationalDays,
        operationalHours,
        minimumBookingHours,
        maximumPax,
        instantBooking,
        type,
        verifications,
        terms,
        status: "PENDING",
        active: false,
      },
    });

    if (Array.isArray(packages) && packages.length > 0) {
      await prisma.package.createMany({
        data: packages.map((p: PackageInput) => ({
          title: String(p.title),
          originalPrice: p.originalPrice != null ? Number(p.originalPrice) : 0,
          offeredPrice: Number(p.offeredPrice),
          features: Array.isArray(p.features) ? p.features.map(String) : [],
          durationHours: Number(p.durationHours),
          listingId: listing.id,
        })),
      });
    }

    const withPackages = await prisma.listing.findUnique({
      where: { id: listing.id },
      include: { packages: true },
    });

    return createSuccessResponse(withPackages, 201, "Listing created successfully");
  } catch (error) {
    return handleRouteError(error, "POST /api/listings");
  }
}
