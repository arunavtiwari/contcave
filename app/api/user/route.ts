import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const { name, description, location, languages, title, email, phone, profileImage } = body;

  if (
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof location !== "string" ||
    !Array.isArray(languages) ||
    !languages.every((lang) => typeof lang === "string") ||
    typeof title !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string"
  ) {
    throw new Error("Invalid input");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { email: currentUser?.email ?? "" },
      data: { name, description, location, languages, title, email, phone, profileImage },
    });
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.error();
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "PUT, OPTIONS"
    }
  });
}

export const dynamic = "force-dynamic";
