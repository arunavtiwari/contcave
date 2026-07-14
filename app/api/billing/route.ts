import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError, readJsonObject } from "@/lib/api-utils";
import { BillingService } from "@/lib/billing/service";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const parsedBody = await readJsonObject(req, 25_000);
    if (!parsedBody.success) return parsedBody.response;

    try {
      const billingRecord = await BillingService.upsertRecord(currentUser.id, parsedBody.data);
      return createSuccessResponse(billingRecord, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upsert billing record";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "POST /api/billing");
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return createErrorResponse("Unauthorized", 401);

    const records = await BillingService.getRecords(currentUser.id);
    return createSuccessResponse(records);
  } catch (error) {
    return handleRouteError(error, "GET /api/billing");
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return createErrorResponse("Unauthorized", 401);

    const parsedBody = await readJsonObject(req, 25_000);
    if (!parsedBody.success) return parsedBody.response;
    const body = parsedBody.data;
    const { id, ...data } = body;

    if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) {
      return createErrorResponse("A valid billing record ID is required", 400);
    }

    try {
      const updated = await BillingService.updateRecord(currentUser.id, id, data);
      return createSuccessResponse(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update billing record";
      return createErrorResponse(message, 400);
    }
  } catch (error) {
    return handleRouteError(error, "PUT /api/billing");
  }
}
