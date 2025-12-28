import prisma from "@/lib/prismadb";
import bcrypt from "bcryptjs";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, password, phone, is_owner = false } = body;

    if (!email || !name || !password) {
      return createErrorResponse("Email, name, and password are required", 400);
    }

    if (is_owner && !phone) {
      return createErrorResponse("Phone number is required for owners", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return createErrorResponse("Email already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        hashedPassword,
        phone: is_owner ? phone : undefined,
        is_owner,
      },
    });

    const { hashedPassword: _, ...userWithoutPassword } = user;

    return createSuccessResponse(userWithoutPassword, 201, "User registered successfully");
  } catch (error) {
    return handleRouteError(error, "POST /api/register");
  }
}
