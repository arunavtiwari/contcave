import { PayoutService } from "@/lib/payout/service";

/**
 * Automatic owner payouts can be paused with PAYOUT_AUTO_SPLIT_ENABLED=false (e.g. while payouts
 * are being processed by hand). Anything marked "paid manually" in admin is never split again,
 * so turning the switch back on is safe.
 */
export const isAutoPayoutEnabled = () => process.env.PAYOUT_AUTO_SPLIT_ENABLED !== "false";

export async function runDueSplits(limit = 200) {
    if (!isAutoPayoutEnabled()) {
        console.warn("[Maintenance] Split payout job skipped: PAYOUT_AUTO_SPLIT_ENABLED=false");
        return [];
    }
    console.warn(`[Maintenance] Starting split payout job (limit: ${limit})`);
    return await PayoutService.processDueSplits(limit);
}
