import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));
const envFile = `${root}.env`;
const localEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const EVAL_TIMEOUT_MS = 30 * 60_000;

export default defineConfig({
    resolve: {
        alias: [
            { find: /^@\//, replacement: `${root}` },
            { find: /^server-only$/, replacement: `${root}node_modules/server-only/empty.js` },
        ],
    },
    test: {
        environment: "node",
        projects: [
            { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
            {
                extends: true,
                test: {
                    name: "eval",
                    include: ["tests/eval/**/*.eval.ts"],
                    env: localEnv as Record<string, string>,
                    testTimeout: EVAL_TIMEOUT_MS,
                },
            },
        ],
    },
});
