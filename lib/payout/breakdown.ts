/**
 * Per-booking payout breakdown: what the customer pays, what is deducted (commission, GST on
 * commission, TCS, TDS) and what the studio receives. Pure and client-safe, so the admin form
 * can show it live and the server can store the same result with the booking.
 *
 * Models:
 * - A_AGENT        studio has a GSTIN and supplies the customer; we are the agent.
 * - B_PRINCIPAL    non-GST studio; we buy at (1 - commission) and resell with GST.
 * - C_PASSTHROUGH  non-GST studio supplies the customer directly on a bill of supply.
 *                  What-if only until the bill-of-supply invoice is built.
 */

export const CONTCAVE_STATE_CODE = "09"; // UP
export const DEFAULT_COMMISSION_PCT = 0.12;

const GST = 0.18;
const ECOM_TCS_RATE = 0.005; // GST e-commerce TCS
const ECOM_TDS_RATE = 0.001; // e-commerce TDS (§393(1), erstwhile 194-O)
const ECOM_TDS_INDIVIDUAL_THRESHOLD = 500_000;
const CONTRACT_TDS_SINGLE_THRESHOLD = 30_000; // 194C single payment
const CONTRACT_TDS_ANNUAL_THRESHOLD = 100_000; // 194C aggregate in the FY
const NO_PAN_TDS_RATE = 0.2;

export type PayoutModel = "A_AGENT" | "B_PRINCIPAL" | "C_PASSTHROUGH";
export type NonGstModel = "principal" | "passthrough";
export type GstTaxKind = "CGST_SGST" | "IGST" | "NONE";

export type PayoutBreakdownInput = {
    baseValue: number; // ex-GST booking value
    studioGstin?: string | null;
    propertyStateCode?: string | null;
    nonGstModel?: NonGstModel;
    /** PAN for non-GST studios; for GST studios it is read from the GSTIN. */
    studioPan?: string | null;
    /** The studio has told us it has no PAN (statutory higher TDS applies). */
    studioHasNoPan?: boolean;
    /** Ex-GST value booked through us for this studio owner earlier in the FY. */
    fyGrossSoFar?: number;
    commissionPct?: number;
    /** Model B only: overrides the base value used for the studio's cut. */
    customStudioPrice?: number | null;
};

export type PayoutBreakdown = {
    model: PayoutModel;
    taxKind: GstTaxKind;
    supplierStateCode: string | null;
    placeOfSupplyStateCode: string | null;
    baseValue: number;
    commissionPct: number;
    collected: number;
    customerGst: number;
    commission: number;
    commissionGst: number;
    tcs: number;
    tds: number;
    tdsRate: number;
    tdsSection: string;
    /** Model B: what we owe the studio before TDS. */
    studioAmount: number | null;
    payout: number;
    contcaveKeeps: number;
    /** GST we remit: commission GST (A, C) or the customer GST (B). */
    gstWeRemit: number;
    panEntityType: string | null;
    notes: string[];
    /** Set when this model can't be used for a live booking yet. */
    blockedReason: string | null;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function normalizePan(pan: string | null | undefined): string | null {
    const value = pan?.trim().toUpperCase();
    return value && PAN_REGEX.test(value) ? value : null;
}

/** The PAN inside a GSTIN: characters 3–12, i.e. indexes 2–11. */
export function panFromGstin(gstin: string | null | undefined): string | null {
    const value = gstin?.trim().toUpperCase();
    return value && value.length === 15 ? normalizePan(value.slice(2, 12)) : null;
}

/** The PAN's 4th letter: P individual, H HUF, F firm/LLP, C company, A AOP, T trust, … */
export function panEntityType(pan: string | null | undefined): string | null {
    return normalizePan(pan)?.charAt(3) ?? null;
}

const ENTITY_LABELS: Record<string, string> = {
    P: "Individual",
    H: "HUF",
    F: "Firm / LLP",
    C: "Company",
    A: "AOP",
    T: "Trust",
    B: "BOI",
    G: "Government",
    L: "Local authority",
    J: "Artificial juridical person",
};

export const panEntityLabel = (type: string | null) => (type ? ENTITY_LABELS[type] ?? type : "Unknown");

export function payoutModelFor(studioGstin: string | null | undefined, nonGstModel: NonGstModel = "principal"): PayoutModel {
    if (studioGstin?.trim()) return "A_AGENT";
    return nonGstModel === "passthrough" ? "C_PASSTHROUGH" : "B_PRINCIPAL";
}

export const PAYOUT_MODEL_LABELS: Record<PayoutModel, string> = {
    A_AGENT: "A · GST studio (agent)",
    B_PRINCIPAL: "B · Non-GST studio (principal)",
    C_PASSTHROUGH: "C · Non-GST studio (pass-through)",
};

export const PASSTHROUGH_BLOCKED_REASON =
    "Pass-through bookings need a bill of supply, which isn't built yet. Use this to check the numbers only; record the booking as principal (B) for now.";

export function computePayoutBreakdown(input: PayoutBreakdownInput): PayoutBreakdown {
    const notes: string[] = [];
    const BV = round2(Math.max(0, input.baseValue || 0));
    const commissionPct = input.commissionPct ?? DEFAULT_COMMISSION_PCT;
    const fyGross = Math.max(0, input.fyGrossSoFar || 0);
    const gstin = input.studioGstin?.trim().toUpperCase() || null;
    const model = payoutModelFor(gstin, input.nonGstModel);
    const placeOfSupply = input.propertyStateCode?.trim() || null;

    // GST type. Place of supply is always the property's state, never the customer's.
    const supplierState = model === "A_AGENT" ? gstin!.slice(0, 2) : CONTCAVE_STATE_CODE;
    const taxKind: GstTaxKind = model === "C_PASSTHROUGH"
        ? "NONE"
        : supplierState === placeOfSupply ? "CGST_SGST" : "IGST";
    if (!placeOfSupply) notes.push("Property state code is missing, so the GST type assumes inter-state (IGST).");

    const commission = round2(BV * commissionPct);
    const commissionGst = round2(commission * GST);

    const pan = model === "A_AGENT" ? panFromGstin(gstin) : normalizePan(input.studioPan);
    const entityType = panEntityType(pan);

    let tcs = 0;
    let tds = 0;
    let tdsRate = 0;
    let tdsSection = "";
    let studioAmount: number | null = null;
    let collected: number;
    let customerGst: number;
    let payout: number;
    let contcaveKeeps: number;
    let gstWeRemit: number;
    let blockedReason: string | null = null;

    if (model === "A_AGENT") {
        tcs = round2(BV * ECOM_TCS_RATE);
        tdsSection = "E-commerce TDS §393(1) (erstwhile 194-O)";
        const individualLike = entityType === "P" || entityType === "H";
        if (individualLike && fyGross + BV <= ECOM_TDS_INDIVIDUAL_THRESHOLD) {
            notes.push(`No e-commerce TDS: ${panEntityLabel(entityType)} below ₹5,00,000 for the FY (₹${Math.round(fyGross + BV).toLocaleString("en-IN")} incl. this booking).`);
        } else {
            tdsRate = ECOM_TDS_RATE;
            tds = round2(BV * tdsRate);
        }
        if (!entityType) notes.push("Couldn't read the PAN from the GSTIN; TDS applied at 0.1% without the individual threshold.");

        customerGst = round2(BV * GST);
        collected = round2(BV + customerGst);
        payout = round2(collected - commission - commissionGst - tcs - tds);
        contcaveKeeps = commission;
        gstWeRemit = commissionGst;
        notes.push("Commission GST, TCS and TDS are passed through to the government, not kept.");
    } else if (model === "B_PRINCIPAL") {
        customerGst = round2(BV * GST);
        collected = round2(BV + customerGst);
        const studioBase = input.customStudioPrice && input.customStudioPrice > 0 ? input.customStudioPrice : BV;
        studioAmount = round2(studioBase * (1 - commissionPct));

        tdsSection = "194C (contract)";
        const overThreshold = fyGross + BV > CONTRACT_TDS_ANNUAL_THRESHOLD || studioAmount > CONTRACT_TDS_SINGLE_THRESHOLD;
        if (!overThreshold) {
            notes.push("No 194C TDS: below ₹30,000 for this payment and ₹1,00,000 for the FY.");
        } else if (input.studioHasNoPan) {
            tdsRate = NO_PAN_TDS_RATE;
            notes.push("Studio has no PAN: TDS at the statutory 20%.");
        } else if (entityType) {
            tdsRate = entityType === "P" || entityType === "H" ? 0.01 : 0.02;
        } else {
            tdsRate = 0.02;
            notes.push("PAN not on file: TDS assumed at 2%. Add the studio's PAN to get the right rate (1% for individuals/HUF).");
        }
        tds = round2(studioAmount * tdsRate);

        payout = round2(studioAmount - tds);
        contcaveKeeps = round2(BV - studioAmount);
        gstWeRemit = customerGst;
        notes.push("We supply the customer and remit the 18% GST; the studio's share is our purchase cost.");
    } else {
        customerGst = 0;
        collected = BV;
        // The studio bills the full booking value; our commission is a separate supply to the
        // studio. Which TDS applies (194C vs e-commerce 0.1%) is pending the CA's view, so none
        // is deducted here and both candidates are shown.
        tdsSection = "Pending CA confirmation";
        const as194c = round2(BV * (entityType === "P" || entityType === "H" ? 0.01 : 0.02));
        const asEcom = round2(BV * ECOM_TDS_RATE);
        notes.push(`TDS not applied until the CA confirms the section. On ₹${BV.toLocaleString("en-IN")}: 194C would be ₹${as194c.toLocaleString("en-IN")}, e-commerce TDS 0.1% would be ₹${asEcom.toLocaleString("en-IN")}.`);
        payout = round2(BV - commission - commissionGst);
        contcaveKeeps = commission;
        gstWeRemit = commissionGst;
        blockedReason = PASSTHROUGH_BLOCKED_REASON;
    }

    return {
        model,
        taxKind,
        supplierStateCode: supplierState,
        placeOfSupplyStateCode: placeOfSupply,
        baseValue: BV,
        commissionPct,
        collected,
        customerGst,
        commission,
        commissionGst,
        tcs,
        tds,
        tdsRate,
        tdsSection,
        studioAmount,
        payout,
        contcaveKeeps,
        gstWeRemit,
        panEntityType: entityType,
        notes,
        blockedReason,
    };
}

/** Start of the Indian financial year (1 April, IST) containing `date`. */
export function financialYearStart(date = new Date()): Date {
    const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    const year = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1;
    return new Date(Date.UTC(year, 3, 1) - 5.5 * 60 * 60 * 1000);
}
