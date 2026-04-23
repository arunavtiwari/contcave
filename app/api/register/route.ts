import { NextRequest } from "next/server";

import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { sendEmail } from "@/lib/email/mailer";
import { getCustomerOnboardingTemplate } from "@/lib/email/templates";
import { normalizePhone } from "@/lib/phone";
import prisma from "@/lib/prismadb";
import { UserService } from "@/lib/user/service";
import { ownerRegisterSchema, registerSchema } from "@/schemas/auth";
import { UserRole } from "@/types/user";

export async function POST(request: NextRequest) {
  try {
    if (!request.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const body = await request.json().catch(() => ({}));
    const { email, name, password, phone, role = UserRole.CUSTOMER } = body;

    const isOwner = role === UserRole.OWNER || role === UserRole.ADMIN;


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

    try {
      const user = await UserService.register({
        email: trimmedEmail,
        name: trimmedName,
        password: validData.password,
        phone: normalizedPhone || undefined,
        role: isOwner ? UserRole.OWNER : UserRole.CUSTOMER
      });

      if (!isOwner) {
        sendEmail({
          toEmail: user.email!,
          subject: "Welcome to ContCave!",
          html: getCustomerOnboardingTemplate(user.name || "there"),
        }).catch(err => console.error("[RegistrationEmail] Failed:", err));
      }

      return createSuccessResponse(user, 201, "User registered successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/register");
  }
}
