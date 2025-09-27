import getCurrentUser from "@/app/actions/getCurrentUser";
import prisma from "@/lib/prismadb";
import { NextResponse } from "next/server";
import { normalizePhone } from "@/lib/phone";

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.error();
  }

  const body = await request.json();
  const { name, description, location, languages, title, email, phone, profileImage, is_owner, is_verified  } = body;

  if (
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof location !== "string" ||
    !Array.isArray(languages) ||
    !languages.every((lang) => typeof lang === "string") ||
    typeof title !== "string" ||
    typeof email !== "string" ||
    typeof phone !== "string" ||
    typeof is_owner !== "boolean" ||
    typeof is_verified !== "boolean"
  ) {
    throw new Error("Invalid input");
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { email: currentUser?.email ?? "" },
      data: { name, description, location, languages, title, email, phone, profileImage, is_owner, is_verified  },
    });
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Failed to update user:", error);
    return NextResponse.error();
  }
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.error();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const phone = body?.phone;
  if (typeof phone !== "string") {
    return NextResponse.json({ message: "phone must be a string" }, { status: 400 });
  }

  const normalized = normalizePhone(phone);
  if (!normalized) {
    return NextResponse.json({ message: "Enter a valid 10-digit mobile number" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { email: currentUser?.email ?? "" },
      data: { phone: normalized },
      select: { id: true, phone: true },
    });
    return NextResponse.json({ ok: true, phone: updated.phone }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to update phone:", error);
    return NextResponse.error();
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "PUT, PATCH, OPTIONS"
    }
  });
}

export const dynamic = "force-dynamic";
