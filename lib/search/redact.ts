const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const INDIAN_MOBILE_PATTERN = /(?<!\d)(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?!\d)/g;
const INTERNATIONAL_PATTERN = /\+\d[\d\s-]{8,}\d/g;

export function redactPersonalData(text: string) {
    return text
        .replace(EMAIL_PATTERN, "[email]")
        .replace(INTERNATIONAL_PATTERN, "[phone]")
        .replace(INDIAN_MOBILE_PATTERN, "[phone]");
}

export const containsPersonalData = (text: string) => redactPersonalData(text) !== text;
