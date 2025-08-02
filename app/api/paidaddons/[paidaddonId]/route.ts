import { NextResponse } from "next/server";
import prisma from "@/lib/prismadb";

interface IParams {
  paidaddonId?: string;
}

export async function DELETE(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;

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
