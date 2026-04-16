import type { MetaStandardEvent } from "@/constants/metaPixel";

export type MetaStandardEventName =
    (typeof MetaStandardEvent)[keyof typeof MetaStandardEvent];

declare global {
    interface Window {
        fbq: ((
            command: "track" | "trackCustom" | "init",
            eventName: string,
            params?: Record<string, unknown>,
            options?: { eventID?: string },
        ) => void) & {
            callMethod?: (...args: unknown[]) => void;
            queue?: unknown[];
            loaded?: boolean;
            version?: string;
            push?: (...args: unknown[]) => void;
        };
        _fbq?: typeof window.fbq;
    }
}

export interface CAPIUserData {
    em?: string;
    ph?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
    external_id?: string;
}

export interface CAPIEventPayload {
    event_name: MetaStandardEventName | string;
    event_time: number;
    event_id: string;
    event_source_url?: string;
    action_source: "website" | "app" | "email" | "phone_call" | "chat" | "other";
    user_data: CAPIUserData;
    custom_data?: Record<string, unknown>;
    opt_out?: boolean;
}

export interface CAPIResponse {
    events_received: number;
    messages?: string[];
    fbtrace_id?: string;
}
