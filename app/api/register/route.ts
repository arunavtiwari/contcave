import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { ownerRegisterSchema,registerSchema } from "@/lib/schemas/auth";

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return stripped.length === 10 ? stripped : null;
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const body = await request.json().catch(() => ({}));
    const { email, name, password, phone, is_owner = false } = body;

    const isOwner = Boolean(is_owner);


    const schema = isOwner ? ownerRegisterSchema : registerSchema;
    const validation = schema.safeParse({ email, name, password, phone });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(firstError.message, 400);
    }

    const validData = validation.data;
    const trimmedEmail = validData.email.trim().toLowerCase();
    const trimmedName = validData.name.trim();


    let normalizedPhone: string | null = null;
    if (isOwner) {

      const phoneValue = (validData as unknown as { phone: string }).phone;
      normalizedPhone = normalizePhone(phoneValue);
      if (!normalizedPhone) {
        return createErrorResponse("Invalid phone number format. Please provide a valid 10-digit phone number", 400);
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: trimmedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return createErrorResponse("An account with this email already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(validData.password, 12);

    const user = await prisma.user.create({
      data: {
        email: trimmedEmail,
        name: trimmedName,
        hashedPassword,
        phone: normalizedPhone || undefined,
        is_owner: isOwner,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        is_owner: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createSuccessResponse(user, 201, "User registered successfully");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("An account with this email already exists", 409);
    }
    return handleRouteError(error, "POST /api/register");
  }
}
