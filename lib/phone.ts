export function normalizePhone(raw?: string): string {
    const digits = String(raw || "").replace(/\D/g, "");
    if (!digits) return "";
    if (digits.length >= 12 && digits.startsWith("91")) return digits.slice(-10);
    if (digits.length >= 10) return digits.slice(-10);
    return "";
}

export function isValidPhone10(raw?: string): boolean {
    return normalizePhone(raw).length === 10;
}
