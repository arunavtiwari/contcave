export const CONSENT_COOKIE_NAME = "CC_CONSENT";

export type StoredConsent = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export function parseConsentCookie(cookieHeader: string): StoredConsent | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE_NAME}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    const value = JSON.parse(decodeURIComponent(match[1])) as Partial<StoredConsent>;
    if (
      value.necessary !== true
      || typeof value.analytics !== "boolean"
      || typeof value.marketing !== "boolean"
    ) {
      return null;
    }
    return value as StoredConsent;
  } catch {
    return null;
  }
}

export function hasMarketingConsent(cookieHeader: string): boolean {
  return parseConsentCookie(cookieHeader)?.marketing === true;
}
