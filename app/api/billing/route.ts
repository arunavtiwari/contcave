import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";
import { billingSchema } from "@/lib/schemas/billing";

/**
 * POST → Create new or update existing BillingDetails (if GSTIN already exists)
 */
export async function POST(req: Request) {
  try {
    if (!req.headers.get("content-type")?.includes("application/json")) {
      return createErrorResponse("Content-Type must be application/json", 415);
    }

    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const { companyName, gstin, billingAddress, isDefault } = body;

    // Validate using Zod schema
    const validation = billingSchema.safeParse({ companyName, gstin, billingAddress });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      return createErrorResponse(firstError.message, 400);
    }

    const validData = validation.data;
    const isDefaultValue = Boolean(isDefault);

    if (isDefaultValue) {
      await prisma.billingDetails.updateMany({
        where: { userId: currentUser.id, isDefault: true },
        data: { isDefault: false },
      }).catch(() => { });
    }

    const existing = await prisma.billingDetails.findFirst({
      where: { userId: currentUser.id, gstin: validData.gstin },
      select: { id: true, isDefault: true },
    });

    let billingRecord;

    if (existing) {
      billingRecord = await prisma.billingDetails.update({
        where: { id: existing.id },
        data: {
          companyName: validData.companyName,
          billingAddress: validData.billingAddress,
          isDefault: isDefaultValue,
          updatedAt: new Date(),
        },
      });
    } else {
      billingRecord = await prisma.billingDetails.create({
        data: {
          userId: currentUser.id,
          companyName: validData.companyName,
          gstin: validData.gstin,
          billingAddress: validData.billingAddress,
          isDefault: isDefaultValue,
        },
      });
    }

    return createSuccessResponse(billingRecord, 201);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return createErrorResponse("A billing record with this GSTIN already exists", 409);
    }
    return handleRouteError(error, "POST /api/billing");
  }
}

/**
 * GET → Retrieve all billing records for the current user
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createErrorResponse("Unauthorized", 401);
    }

    const records = await prisma.billingDetails.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse(records);
  } catch (error) {
    return handleRouteError(error, "GET /api/billing");
  }
}

/**
 * PUT → Update specific billing record by ID
 */
export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const { id, companyName, gstin, billingAddress, isDefault } = body;

    if (!id) {
      return createErrorResponse("Billing record ID is required", 400);
    }

    const existing = await prisma.billingDetails.findUnique({ where: { id } });
    if (!existing || existing.userId !== currentUser.id) {
      return createErrorResponse("Not found or unauthorized", 404);
    }

    if (isDefault) {
      await prisma.billingDetails.updateMany({
        where: { userId: currentUser.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.billingDetails.update({
      where: { id },
      data: {
        companyName: companyName ?? existing.companyName,
        gstin: gstin ?? existing.gstin,
        billingAddress: billingAddress ?? existing.billingAddress,
        isDefault: isDefault ?? existing.isDefault,
      },
    });

    return createSuccessResponse(updated);
  } catch (error) {
    return handleRouteError(error, "PUT /api/billing");
  }
}
