import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import prisma from "@/lib/prismadb";

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

    if (!companyName || typeof companyName !== "string") {
      return createErrorResponse("companyName is required and must be a string", 400);
    }

    const trimmedCompanyName = companyName.trim();
    if (trimmedCompanyName.length < 2) {
      return createErrorResponse("companyName must be at least 2 characters long", 400);
    }
    if (trimmedCompanyName.length > 200) {
      return createErrorResponse("companyName is too long (max 200 characters)", 400);
    }

    if (!gstin || typeof gstin !== "string") {
      return createErrorResponse("gstin is required and must be a string", 400);
    }

    const upperGstin = gstin.trim().toUpperCase();
    const gstRegex = /^[0-9A-Z]{15}$/;
    if (!gstRegex.test(upperGstin)) {
      return createErrorResponse("Invalid GSTIN format. Must be 15 alphanumeric characters", 400);
    }

    if (!billingAddress || typeof billingAddress !== "string") {
      return createErrorResponse("billingAddress is required and must be a string", 400);
    }

    const trimmedAddress = billingAddress.trim();
    if (trimmedAddress.length < 10) {
      return createErrorResponse("billingAddress must be at least 10 characters long", 400);
    }
    if (trimmedAddress.length > 500) {
      return createErrorResponse("billingAddress is too long (max 500 characters)", 400);
    }

    const isDefaultValue = Boolean(isDefault);

    if (isDefaultValue) {
      await prisma.billingDetails.updateMany({
        where: { userId: currentUser.id, isDefault: true },
        data: { isDefault: false },
      }).catch(() => {});
    }

    const existing = await prisma.billingDetails.findFirst({
      where: { userId: currentUser.id, gstin: upperGstin },
      select: { id: true, isDefault: true },
    });

    let billingRecord;

    if (existing) {
      billingRecord = await prisma.billingDetails.update({
        where: { id: existing.id },
        data: {
          companyName: trimmedCompanyName,
          billingAddress: trimmedAddress,
          isDefault: isDefaultValue,
          updatedAt: new Date(),
        },
      });
    } else {
      billingRecord = await prisma.billingDetails.create({
        data: {
          userId: currentUser.id,
          companyName: trimmedCompanyName,
          gstin: upperGstin,
          billingAddress: trimmedAddress,
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
