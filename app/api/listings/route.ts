import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { geocodeDisplayName } from "@/lib/geocode";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.error();

  const body = await request.json();
  const {
    title, description, imageSrc, category, locationValue, actualLocation,
    price, amenities, otherAmenities, addons, carpetArea, operationalDays,
    operationalHours, minimumBookingHours, maximumPax, instantBooking, type,
    verifications, terms, packages,
  } = body;

  if (!title || !description || !imageSrc || !category || !locationValue || price == null) {
    return NextResponse.error();
  }

  let finalActualLocation = actualLocation;
  if (actualLocation && typeof actualLocation === "object" && actualLocation.display_name && !actualLocation.latlng) {
    const geo = await geocodeDisplayName(String(actualLocation.display_name));
    if (geo) {
      finalActualLocation = { ...actualLocation, latlng: [geo.lat, geo.lng] };
    }
  }

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
      data: packages.map((p: any) => ({
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

  return NextResponse.json(withPackages);
}
