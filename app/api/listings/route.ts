import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.error();

  const body = await request.json();
  const {
    title,
    description,
    imageSrc,
    category,
    locationValue,
    actualLocation,
    price,
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
    bookingApprovalCount,
    verifications,
    terms
  } = body;

  if (
    !title ||
    !description ||
    !imageSrc ||
    !category ||
    !locationValue ||
    !price
  ) {
    return NextResponse.error();
  }

  const listing = await prisma.listing.create({
    data: {
      title,
      description,
      imageSrc,
      category,
      locationValue,
      actualLocation,
      price: parseInt(price, 10),
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
      bookingApprovalCount,
      verifications,
      terms
    }
  });

  return NextResponse.json(listing);
}
