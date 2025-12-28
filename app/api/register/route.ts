import prisma from "@/lib/prismadb";
import bcrypt from "bcryptjs";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { NextRequest } from "next/server";

function normalizePhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const stripped = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  return stripped.length === 10 ? stripped : null;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password must be less than 128 characters" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const body = await request.json().catch(() => ({}));
    const { email, name, password, phone, is_owner = false } = body;

    if (!email || typeof email !== "string") {
      return createErrorResponse("Email is required and must be a string", 400);
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!validateEmail(trimmedEmail)) {
      return createErrorResponse("Invalid email format", 400);
    }

    if (trimmedEmail.length > 255) {
      return createErrorResponse("Email is too long (max 255 characters)", 400);
    }

    if (!name || typeof name !== "string") {
      return createErrorResponse("Name is required and must be a string", 400);
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return createErrorResponse("Name must be at least 2 characters long", 400);
    }

    if (trimmedName.length > 100) {
      return createErrorResponse("Name is too long (max 100 characters)", 400);
    }

    if (!password || typeof password !== "string") {
      return createErrorResponse("Password is required and must be a string", 400);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return createErrorResponse(passwordValidation.message || "Invalid password", 400);
    }

    const isOwner = Boolean(is_owner);
    let normalizedPhone: string | null = null;

    if (isOwner) {
      if (!phone || typeof phone !== "string") {
        return createErrorResponse("Phone number is required for owners", 400);
      }
      normalizedPhone = normalizePhone(phone);
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

    const hashedPassword = await bcrypt.hash(password, 12);

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
