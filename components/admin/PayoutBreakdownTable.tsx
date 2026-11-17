import { FiAlertTriangle } from "react-icons/fi";

import {
  panEntityLabel,
  PAYOUT_MODEL_LABELS,
  type PayoutBreakdown,
} from "@/lib/payout/breakdown";
import { cn, formatINR } from "@/lib/utils";

const TAX_KIND_LABELS: Record<PayoutBreakdown["taxKind"], string> = {
  CGST_SGST: "CGST + SGST (intra-state)",
  IGST: "IGST (inter-state)",
  NONE: "No GST (bill of supply)",
};

const pct = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;

function Row({
  label,
  value,
  hint,
  tone,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "minus" | "plus";
  strong?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5", strong && "border-t border-border pt-2.5 mt-1")}>
      <div className="min-w-0">
        <div className={cn("text-xs", strong ? "font-semibold text-foreground" : "text-foreground")}>{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      </div>
      <div
        className={cn(
          "shrink-0 font-mono text-xs tabular-nums",
          strong ? "text-sm font-semibold text-foreground" : "text-foreground",
          tone === "minus" && "text-destructive"
        )}
      >
        {tone === "minus" ? "− " : ""}
        {value}
      </div>
    </div>
  );
}

/** What the customer pays, what is deducted, and what the studio receives, for one booking. */
export default function PayoutBreakdownTable({ breakdown }: { breakdown: PayoutBreakdown }) {
  const b = breakdown;
  const isB = b.model === "B_PRINCIPAL";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Model: <span className="font-medium text-foreground">{PAYOUT_MODEL_LABELS[b.model]}</span>
        </span>
        <span>
          GST: <span className="font-medium text-foreground">{TAX_KIND_LABELS[b.taxKind]}</span>
          {b.taxKind !== "NONE" && b.supplierStateCode ? ` · supplier ${b.supplierStateCode} → property ${b.placeOfSupplyStateCode ?? "?"}` : ""}
        </span>
        <span>
          Entity: <span className="font-medium text-foreground">{panEntityLabel(b.panEntityType)}</span>
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-border bg-background px-3 py-1.5">
          <div className="pt-1 text-[11px] font-semibold uppercase text-muted-foreground">Customer</div>
          <Row label="Booking value (ex-GST)" value={formatINR(b.baseValue)} />
          <Row
            label={b.customerGst > 0 ? "GST 18%" : "GST"}
            value={formatINR(b.customerGst)}
            hint={b.customerGst > 0 ? (isB ? "Remitted by ContCave" : "Remitted by the studio") : "Bill of supply, no GST"}
          />
          <Row label="Customer pays" value={formatINR(b.collected)} strong />
        </div>

        <div className="rounded-lg border border-border bg-background px-3 py-1.5">
          <div className="pt-1 text-[11px] font-semibold uppercase text-muted-foreground">Studio payout</div>
          {isB ? (
            <Row
              label={`Studio share (${pct(1 - b.commissionPct)})`}
              value={formatINR(b.studioAmount ?? 0)}
              hint="Our purchase cost from the studio"
            />
          ) : (
            <>
              <Row label="Collected" value={formatINR(b.collected)} />
              <Row label={`Commission ${pct(b.commissionPct)}`} value={formatINR(b.commission)} tone="minus" />
              <Row label="GST on commission 18%" value={formatINR(b.commissionGst)} tone="minus" />
            </>
          )}
          {b.tcs > 0 ? <Row label="TCS 0.5%" value={formatINR(b.tcs)} tone="minus" hint="GST e-commerce TCS" /> : null}
          <Row
            label={b.tds > 0 ? `TDS ${pct(b.tdsRate)}` : "TDS"}
            value={formatINR(b.tds)}
            tone={b.tds > 0 ? "minus" : undefined}
            hint={b.tdsSection}
          />
          <Row label="Studio receives" value={formatINR(b.payout)} strong />
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">ContCave keeps</div>
          <div className="font-mono text-sm font-semibold text-foreground">{formatINR(b.contcaveKeeps)}</div>
        </div>
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <div className="text-[11px] text-muted-foreground">ContCave remits (GST{b.tcs || b.tds ? ", TCS, TDS" : ""})</div>
          <div className="font-mono text-sm font-semibold text-foreground">{formatINR(b.gstWeRemit + b.tcs + b.tds)}</div>
        </div>
      </div>

      {b.notes.length > 0 ? (
        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
          {b.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      {b.blockedReason ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-xs text-warning">
          <FiAlertTriangle className="mt-0.5 shrink-0" size={14} />
          <span>{b.blockedReason}</span>
        </div>
      ) : null}
    </div>
  );
}
