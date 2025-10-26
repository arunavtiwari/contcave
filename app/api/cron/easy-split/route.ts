import { NextRequest, NextResponse } from "next/server";
import { runDueSplits } from "@/lib/cron/runDueSplits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const isGitHubAction = req.headers.get("x-github-secret") === process.env.CRON_SECRET;

    if (!isGitHubAction) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const limit = Number(req.nextUrl.searchParams.get("limit") || 200);
    const results = await runDueSplits(limit);
    const ok = results.filter((r) => r.ok).length;

    return NextResponse.json({ ok, total: results.length, results }, { status: 200 });
}
