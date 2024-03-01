import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

interface IParams {
  paidaddonId?: string;
}

export async function DELETE(
  request: Request,
  { params }: { params: IParams }
) {
  
  const { paidaddonId } = params;

  if (!paidaddonId || typeof paidaddonId !== "string") {
    throw new Error("Invalid Id");
  }

  const listing = await prisma.listing.deleteMany({
    where: {
      id: paidaddonId,
    },
  });

  return NextResponse.json(listing);
}
