import prisma from "@/lib/prismadb";

interface IParams {
  tid: string;
}

export default async function getReservation(params: IParams) {
  const { tid } = params || ({} as IParams);

  if (!tid) {
    throw new Error("tid (cfOrderId) is required");
  }

  try {
    const reservation = await prisma.reservation.findFirst({
      where: {
        Transaction: {
          some: { cfOrderId: tid },
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
      startTime: reservation.startTime,
      endTime: reservation.endTime,
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
