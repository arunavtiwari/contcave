
import { getAutomatedNotificationStart } from "@/lib/notification-activation";
import { PayoutService } from "@/lib/payout/service";

export async function runDueSplits(limit = 200) {
    const automationStart = getAutomatedNotificationStart();
    if (!automationStart) return [];
    console.warn(`[Maintenance] Starting split payout job (limit: ${limit})`);
    return await PayoutService.processDueSplits(limit, automationStart);
}
