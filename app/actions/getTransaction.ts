import prisma from "@/lib/prismadb";

type Args = { tid: string };

export default async function getTransaction({ tid }: Args) {
  if (!tid) return null;
  return prisma.transaction.findFirst({
    where: { cfTxnRef: tid },
    include: {
      reservation: { include: { listing: true } },
      listing: true,
      user: true,
    },
  });
}
