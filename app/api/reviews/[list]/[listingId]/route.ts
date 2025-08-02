import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

interface IParams {
  listingId?: string;
}

export async function GET(request: Request, props: { params: Promise<IParams> }) {
  const params = await props.params;
  const currentUser = await getCurrentUser();

  const { listingId } = params;

  if (!listingId || typeof listingId !== "string") {
    throw new Error("Invalid Listing Id");
  }

  const reviews = await prisma.review.findMany({
    where: {
      listingId: listingId,
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(reviews);
}
