"use client";

import { Cashfree, load } from "@cashfreepayments/cashfree-js";
import { useState } from "react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import { formatINR } from "@/lib/utils";

let cashfreePromise: Promise<Cashfree | null> | null = null;
function getCashfree(mode: "sandbox" | "production") {
  if (!cashfreePromise) cashfreePromise = load({ mode });
  return cashfreePromise;
}

type LineItem = {
  name: string;
  qty: number;
  unitPrice: number;
};

type Props = {
  title: string;
  subtitle: string;
  amount: number;
  paymentSessionId?: string | null;
  mode: "sandbox" | "production";
  status: string;
  items?: LineItem[];
  rejectUrl?: string;
};

export default function PostBookingPaymentClient({
  title,
  subtitle,
  amount,
  paymentSessionId,
  mode,
  status,
  items = [],
  rejectUrl,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const canPay = status === "PENDING_PAYMENT" && Boolean(paymentSessionId);

  async function pay() {
    if (!paymentSessionId) return;
    setLoading(true);
    try {
      const cf = await getCashfree(mode);
      if (!cf) throw new Error("Unable to initialize payment gateway");
      await cf.checkout({ paymentSessionId, redirectTarget: "_self" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Payment could not be started");
      setLoading(false);
    }
  }

  async function reject() {
    if (!rejectUrl) return;
    setRejecting(true);
    try {
      const response = await fetch(rejectUrl, { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.success) throw new Error(body?.error || "Unable to reject charge");
      toast.success("Charge rejected");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to reject charge");
      setRejecting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{status.replaceAll("_", " ")}</p>
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-muted/40 p-4">
          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={`${item.name}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 text-sm">
                  <div>
                    <div className="font-medium text-foreground">{item.name}</div>
                    <div className="text-muted-foreground">{item.qty} x {formatINR(item.unitPrice)}</div>
                  </div>
                  <div className="font-semibold text-foreground">{formatINR(item.qty * item.unitPrice)}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="font-semibold text-foreground">Total</span>
            <span className="text-xl font-semibold text-foreground">{formatINR(amount)}</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button label={canPay ? "Pay Now" : "Payment Unavailable"} onClick={pay} loading={loading} disabled={!canPay || rejecting} className="flex-1" />
          {rejectUrl && status === "PENDING_PAYMENT" ? (
            <Button label="Reject" variant="outline" onClick={reject} loading={rejecting} disabled={loading} className="flex-1" />
          ) : null}
        </div>
      </section>
    </main>
  );
}
