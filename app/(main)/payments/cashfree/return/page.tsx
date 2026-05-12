import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Search> };

const first = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : value?.[0] ?? "";

export default async function CashfreeReturnCompatibilityPage({ searchParams }: Props) {
  const sp = await searchParams;
  const tid = first(sp.tid ?? sp.order_id);
  const suffix = tid ? `?tid=${encodeURIComponent(tid)}` : "";

  redirect(`/dashboard/payments/cashfree/return${suffix}`);
}
