import type { Agent } from "https";
import { HttpsProxyAgent } from "https-proxy-agent";

let proxyAgent: Agent | null = null;
let proxyAgentError: Error | null = null;
let lastProxyCheck: number = 0;
const PROXY_CHECK_INTERVAL = 5 * 60 * 1000;

function validateFixieUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }
        if (!parsed.username || !parsed.password) {
            return false;
        }
        if (!parsed.hostname) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export function getFixieProxyAgent(): Agent | undefined {
    const fixieUrl = process.env.PROXY_URL;

    if (!fixieUrl) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[Fixie Proxy] PROXY_URL not set, requests will not use proxy");
        }
        return undefined;
    }

    if (!validateFixieUrl(fixieUrl)) {
        const now = Date.now();
        if (now - lastProxyCheck > PROXY_CHECK_INTERVAL) {
            console.error(
                "[Fixie Proxy] Invalid PROXY_URL format. Expected: http(s)://user:pass@host:port"
            );
            lastProxyCheck = now;
        }
        proxyAgentError = new Error("Invalid PROXY_URL format");
        return undefined;
    }

    if (proxyAgent && !proxyAgentError) {
        return proxyAgent;
    }

    const now = Date.now();
    if (proxyAgentError && now - lastProxyCheck < PROXY_CHECK_INTERVAL) {
        return undefined;
    }

    try {
        const agentOptions = {
            timeout: 10000,
            keepAlive: true,
        };
        proxyAgent = new HttpsProxyAgent(fixieUrl, agentOptions);

        proxyAgentError = null;
        lastProxyCheck = now;

        if (process.env.NODE_ENV === "development") {
            console.warn("[Fixie Proxy] Proxy agent created successfully");
        }

        return proxyAgent;
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        proxyAgentError = err;
        lastProxyCheck = now;

        console.error("[Fixie Proxy] Failed to create proxy agent:", err.message);

        return undefined;
    }
}

export function isProxyAvailable(): boolean {
    return !!process.env.PROXY_URL && !!getFixieProxyAgent();
}

export function resetProxyAgent(): void {
    if (proxyAgent) {
        if ("destroy" in proxyAgent && typeof proxyAgent.destroy === "function") {
            proxyAgent.destroy();
        }
    }
    proxyAgent = null;
    proxyAgentError = null;
    lastProxyCheck = 0;
}

export function handleProxyError(error: unknown, context: string): {
    isProxyError: boolean;
    shouldRetry: boolean;
    message: string;
} {
    if (!error || typeof error !== "object") {
        return {
            isProxyError: false,
            shouldRetry: false,
            message: "Unknown error",
        };
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = "code" in error ? String(error.code) : "";

    const proxyErrorPatterns = [
        /proxy/i,
        /ECONNREFUSED/i,
        /ETIMEDOUT/i,
        /ENOTFOUND/i,
        /ECONNRESET/i,
        /socket hang up/i,
        /tunnel/i,
    ];

    const isProxyError = proxyErrorPatterns.some((pattern) =>
        pattern.test(errorMessage)
    ) || ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET"].includes(errorCode);

    const retryableCodes = ["ETIMEDOUT", "ECONNRESET", "ECONNREFUSED"];
    const shouldRetry =
        isProxyError &&
        (retryableCodes.includes(errorCode) ||
            /timeout|temporary|retry/i.test(errorMessage));

    const message = isProxyError
        ? `Proxy connection error: ${errorMessage}`
        : errorMessage;

    if (isProxyError) {
        console.error(`[Fixie Proxy Error] ${context}:`, {
            message: errorMessage,
            code: errorCode,
            shouldRetry,
        });
    }

    return {
        isProxyError,
        shouldRetry,
        message,
    };
}
