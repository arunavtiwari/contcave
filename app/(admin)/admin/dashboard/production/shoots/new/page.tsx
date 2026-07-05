import { getPlansForShootLog } from "@/app/actions/getProductionData";

import ShootForm from "./ShootForm";

export const dynamic = "force-dynamic";

export default async function NewShootPage() {
    const plans = await getPlansForShootLog();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">Log executed shoot</h1>
                <p className="text-sm text-muted-foreground">
                    Pick a quoted/booked plan, record the actuals, and mark punctuality — reliability
                    updates for every participant.
                </p>
            </div>
            {plans.length === 0 ? (
                <div className="rounded-2xl border border-border bg-background p-6">
                    <p className="text-sm text-muted-foreground">
                        No quoted/booked plans to log against yet.
                    </p>
                </div>
            ) : (
                <ShootForm plans={plans} />
            )}
        </div>
    );
}
