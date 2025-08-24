import prisma from "@/lib/prismadb";

interface IParams {
  rid: string;
}

export default async function getReservation(params: IParams) {
  const { rid } = params || ({} as IParams);

  if (!rid) {
    throw new Error("rid (cfOrderId) is required");
  }

  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        Transaction: {
          some: { cfOrderId: rid },
        },
      },
      include: {
        listing: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!reservation) return null;

    return {
      ...reservation,
      createdAt: reservation.createdAt.toISOString(),
      startDate: reservation.startDate.toISOString(),
      startTime: reservation.startTime.toISOString(),
      endTime: reservation.endTime.toISOString(),
      listing: reservation.listing
        ? {
          ...reservation.listing,
          createdAt: reservation.listing.createdAt.toISOString(),
        }
        : null,
    };
  } catch (error: any) {
    throw new Error(error?.message || "Failed to fetch reservation");
  }
}
