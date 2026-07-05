/* eslint-disable no-console */
/**
 * Hermes WhatsApp connector — open-source WhatsApp Web bridge (Baileys).
 *
 * Runs as a standalone process next to the Next.js app:
 *   HERMES_WA_SHARED_SECRET=... npx tsx scripts/hermes-whatsapp-connector.ts
 *
 * First run prints a QR code — scan it with the ContCave WhatsApp number
 * (Linked devices). The session persists in .hermes/wa-auth/.
 *
 * - Inbound messages  -> POST {APP_URL}/api/hermes/whatsapp/inbound
 * - Outbound sends    <- POST http://127.0.0.1:{PORT}/send { to, text }
 * Both directions authenticate with the shared secret header.
 *
 * NOTE: Baileys drives WhatsApp Web directly (no Business API fees), which is
 * against WhatsApp's ToS for automation — numbers can get banned. Use a
 * dedicated number, keep volumes low, and swap to the Meta Cloud API when
 * volume justifies it (the app-side contract stays the same).
 */

import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    type WAMessage,
} from "@whiskeysockets/baileys";
import { createServer } from "http";
import pino from "pino";
import qrcode from "qrcode-terminal";

const PORT = Number(process.env.HERMES_WA_PORT ?? 8790);
const APP_URL = process.env.HERMES_APP_URL ?? "http://localhost:3000";
const SECRET = process.env.HERMES_WA_SHARED_SECRET ?? "";
const AUTH_DIR = ".hermes/wa-auth";

if (!SECRET) {
    console.error("HERMES_WA_SHARED_SECRET is required");
    process.exit(1);
}

const logger = pino({ level: process.env.HERMES_WA_LOG_LEVEL ?? "warn" });

type Sock = ReturnType<typeof makeWASocket>;
let sock: Sock | null = null;

function extractText(msg: WAMessage): string | undefined {
    const m = msg.message;
    return (
        m?.conversation ??
        m?.extendedTextMessage?.text ??
        m?.imageMessage?.caption ??
        undefined
    );
}

async function forwardInbound(msg: WAMessage): Promise<void> {
    const jid = msg.key.remoteJid ?? "";
    if (!jid.endsWith("@s.whatsapp.net")) return; // ignore groups/status
    if (msg.key.fromMe) return;

    const from = jid.replace("@s.whatsapp.net", "");
    const text = extractText(msg);
    const hasImage = Boolean(msg.message?.imageMessage);
    if (!text && !hasImage) return;

    try {
        const res = await fetch(`${APP_URL}/api/hermes/whatsapp/inbound`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-hermes-secret": SECRET },
            body: JSON.stringify({
                from,
                text: hasImage && !text ? "[image received — media relay lands in Phase 1]" : text,
                mediaUrls: [], // TODO(Phase 1): download media -> R2 -> pass urls
            }),
        });
        if (!res.ok) console.error(`[inbound] app responded ${res.status}`);
        else console.log(`[inbound] ${from}: ${(text ?? "[image]").slice(0, 60)}`);
    } catch (e) {
        console.error("[inbound] forward failed:", e instanceof Error ? e.message : e);
    }
}

async function connect(): Promise<void> {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Baileys API, not a React hook
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    sock = makeWASocket({ auth: state, logger });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log("\nScan this QR with the ContCave WhatsApp number (Linked devices):\n");
            qrcode.generate(qr, { small: true });
        }
        if (connection === "open") console.log("[wa] connected");
        if (connection === "close") {
            const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })
                ?.output?.statusCode;
            if (statusCode === DisconnectReason.loggedOut) {
                console.error(`[wa] logged out — delete ${AUTH_DIR} and re-scan`);
                process.exit(1);
            }
            console.log("[wa] reconnecting…");
            void connect();
        }
    });

    sock.ev.on("messages.upsert", ({ messages, type }) => {
        if (type !== "notify") return;
        for (const msg of messages) void forwardInbound(msg);
    });
}

// Local HTTP API for outbound sends from the app
const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/send") {
        res.writeHead(404).end();
        return;
    }
    if (req.headers["x-hermes-secret"] !== SECRET) {
        res.writeHead(403).end("Forbidden");
        return;
    }
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
        void (async () => {
            try {
                const { to, text } = JSON.parse(raw) as { to?: string; text?: string };
                const digits = (to ?? "").replace(/\D/g, "");
                if (!digits || !text) {
                    res.writeHead(400).end("Missing to/text");
                    return;
                }
                if (!sock) {
                    res.writeHead(503).end("WhatsApp not connected");
                    return;
                }
                await sock.sendMessage(`${digits}@s.whatsapp.net`, { text });
                console.log(`[outbound] ${digits}: ${text.slice(0, 60)}`);
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ sent: true }));
            } catch (e) {
                console.error("[outbound] failed:", e instanceof Error ? e.message : e);
                res.writeHead(500).end("Send failed");
            }
        })();
    });
});

server.listen(PORT, "127.0.0.1", () => {
    console.log(`[hermes-wa] connector listening on 127.0.0.1:${PORT}`);
    void connect();
});
