"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prismadb";



export async function getSession() {
  return await auth();
}

import { User } from "@prisma/client";

export const updateUser = async (userData: Partial<User>) => {
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
  } catch (error: unknown) {
    console.error("Failed to update user:", error);
    throw new Error("Failed to update user");
  }
};

export default updateUser;
