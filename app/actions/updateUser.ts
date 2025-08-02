import prisma from "@/lib/prismadb";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

export const dynamic = "force-dynamic";

export async function getSession() {
  return await getServerSession(authOptions);
}

export const updateUser = async (userData) => {
  try {
    const session = await getSession();

    if (!session?.user?.email) {
      throw new Error("User not authenticated");
    }

    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email as string,
      },
      data: {
        ...userData,
        updatedAt: new Date(),
      },
    });

    return {
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
      emailVerified: updatedUser.emailVerified?.toISOString() || null,
    };
  } catch (error: any) {
    console.error("Failed to update user:", error);
    throw new Error("Failed to update user");
  }
};

export default updateUser;
