import prisma from "@/lib/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function getSession() {
  return await getServerSession(authOptions);
}

export default async function getCurrentUser() {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return null;
    }

    let currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email as string,
      },
    });

    if (!currentUser) {
      return null;
    }

    const userRecord = currentUser as any;

    if (userRecord?.markedForDeletion) {
      currentUser = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          markedForDeletion: false,
          markedForDeletionAt: null,
        } as any,
      });
    }

    const markedForDeletionAt = (currentUser as any)?.markedForDeletionAt as Date | null | undefined;

    return {
      ...currentUser,
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
      markedForDeletionAt: markedForDeletionAt ? markedForDeletionAt.toISOString() : null,
      markedForDeletion: Boolean((currentUser as any)?.markedForDeletion),
      verified_at: currentUser.verified_at
        ? currentUser.verified_at.toISOString()
        : null,
    };
  } catch (error: any) {
    console.log(
      "🚀 ~ file: getCurrentUser.ts ~ getCurrentUser ~ error:",
      error
    );
    return null;
  }
}
