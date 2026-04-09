import 'server-only';

import { auth } from "@/auth";
import prisma from "@/lib/prismadb";

export const dynamic = "force-dynamic";

export async function getSession() {
  return await auth();
}

export default async function getCurrentUser() {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      return null;
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        email: session.user.email,
      },
    });

    if (!currentUser) {
      return null;
    }

    if (currentUser.markedForDeletion) {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          markedForDeletion: false,
          markedForDeletionAt: null,
        },
      });
    }

    return {
      ...currentUser,
      createdAt: currentUser.createdAt.toISOString(),
      updatedAt: currentUser.updatedAt.toISOString(),
      emailVerified: currentUser.emailVerified?.toISOString() || null,
      markedForDeletionAt: currentUser.markedForDeletionAt?.toISOString() || null,
      markedForDeletion: Boolean(currentUser.markedForDeletion),
      verified_at: currentUser.verified_at?.toISOString() || null,
      aadhaar_last4: currentUser.aadhaar_last4,
    };
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      (error as { digest?: string }).digest === 'DYNAMIC_SERVER_USAGE'
    ) {
      throw error;
    }
    console.error('[getCurrentUser] Error:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
