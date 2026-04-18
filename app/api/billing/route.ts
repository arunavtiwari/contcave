import getCurrentUser from "@/app/actions/getCurrentUser";
import { createErrorResponse, createSuccessResponse, handleRouteError } from "@/lib/api-utils";
import { BillingService } from "@/lib/billing/service";

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

    try {
      const billingRecord = await BillingService.upsertRecord(currentUser.id, body);
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

    const body = await req.json().catch(() => ({}));
    const { id, ...data } = body;

    if (!id) return createErrorResponse("Billing record ID is required", 400);

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
