import "server-only";

import { isE2eEffectDisabled } from "@/lib/e2e-guards";

export type ExternalDeliveryChannel = "email" | "whatsapp";

const DISABLE_ENV = {
    email: "E2E_DISABLE_EMAIL_SEND",
    whatsapp: "E2E_DISABLE_WHATSAPP_SEND",
} as const;

/**
 * External delivery is fail-closed outside production. Developers must opt in
 * explicitly when they genuinely need to exercise a live provider locally.
 */
export function isExternalDeliveryDisabled(channel: ExternalDeliveryChannel): boolean {
    if (isE2eEffectDisabled(DISABLE_ENV[channel])) return true;

    return (
        process.env.NODE_ENV !== "production"
        && process.env.ALLOW_EXTERNAL_NOTIFICATIONS_IN_DEVELOPMENT !== "true"
    );
}
