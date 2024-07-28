import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export async function DELETE(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Id");
  }

  const listing = await prisma.listing.deleteMany({
    where: {
      id: listingId,
      userId: currentUser.id,
    },
  });

  return NextResponse.json(listing);
}

export async function PATCH(
  request: Request,
  { params }: { params: IParams }
) {
  const currentUser = await getCurrentUser();

  // Check if the current user exists
  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = params;

  // Validate the listing ID
  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Id");
  }

  // Get and parse the request body for updating the listing
  let body = await request.json();
  delete body.id;
  delete body.user;
  delete body.createdAt;
  // Optionally validate or sanitize body contents as necessary
  if (!body || Object.keys(body).length === 0) {
    throw new Error("Invalid request body");
  }
  // Use Prisma to update the listing, ensuring it belongs to the current user
  const listing = await prisma.listing.update({
    where: {
      id: listingId,
    },
    data: body
  });

  // Return the updated listing as JSON
  return NextResponse.json(listing);
}
