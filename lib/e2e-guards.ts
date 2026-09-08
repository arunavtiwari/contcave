import "server-only";

type E2eEffectFlag =
  | "E2E_DISABLE_EMAIL_SEND"
  | "E2E_DISABLE_WHATSAPP_SEND"
  | "E2E_DISABLE_R2_UPLOAD"
  | "E2E_DISABLE_CASHFREE_REFUND"
  | "E2E_DISABLE_RECURRING_QSTASH";

export function isE2eEffectDisabled(flag: E2eEffectFlag) {
  return process.env.NODE_ENV !== "production" && process.env[flag] === "true";
}

export function isCashfreeSimulatorEnabled() {
  if (process.env.NODE_ENV === "production" || process.env.E2E_ENABLE_CASHFREE_SIMULATOR !== "true") {
    return false;
  }

  const requiredGuards: E2eEffectFlag[] = [
    "E2E_DISABLE_EMAIL_SEND",
    "E2E_DISABLE_WHATSAPP_SEND",
    "E2E_DISABLE_R2_UPLOAD",
    "E2E_DISABLE_CASHFREE_REFUND",
  ];
  return requiredGuards.every(isE2eEffectDisabled);
}

export function getNonProductionEmailVerificationCode() {
  if (process.env.NODE_ENV === "production") return null;
  const deliveryIsDisabled = isE2eEffectDisabled("E2E_DISABLE_EMAIL_SEND")
    || process.env.ALLOW_EXTERNAL_NOTIFICATIONS_IN_DEVELOPMENT !== "true";
  if (!deliveryIsDisabled) return null;
  const configuredCode = process.env.E2E_EMAIL_VERIFICATION_CODE?.trim() || "000000";
  if (!/^\d{6}$/.test(configuredCode)) {
    throw new Error("E2E_EMAIL_VERIFICATION_CODE must contain exactly 6 digits.");
  }
  return configuredCode;
}
