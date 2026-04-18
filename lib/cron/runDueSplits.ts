
import { PayoutService } from "@/lib/payout/service";

export async function runDueSplits(limit = 200) {
    console.warn(`[Cron] Starting split payout job (limit: ${limit})`);
    return await PayoutService.processDueSplits(limit);
}
