import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

interface IParams {
  amenityId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;

  const { amenityId } = params;

  if (!amenityId || typeof amenityId !== "string") {
    throw new Error("Invalid Id");
  }

  const listing = await prisma.listing.delete({
    where: {
      id: amenityId,
    },
  });

  return NextResponse.json(listing);
}
