import { NextResponse } from "next/server";
import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";

interface IParams {
  listingId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
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

export async function PATCH(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Id");
  }

  let body = await request.json();
  delete body.id;
  delete body.user;
  delete body.createdAt;
  if (!body || Object.keys(body).length === 0) {
    throw new Error("Invalid request body");
  }

  const listing = await prisma.listing.update({
    where: {
      id: listingId,
    },
    data: body
  });

  return NextResponse.json(listing);
}
