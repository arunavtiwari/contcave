import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

let hasLoaded = false;

function parseEnvFile(contents: string) {
  const values: Record<string, string> = {};

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separatorIndex = normalized.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = normalized.slice(0, separatorIndex).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let value = normalized.slice(separatorIndex + 1).trim();
    const quote = value[0];
    if ((quote === `"` || quote === "'" || quote === "`") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, "").trim();
    }

    values[key] = value;
  }

  return values;
}

function applyEnvFile(projectDir: string, fileName: string, shellEnvKeys: Set<string>) {
  const filePath = path.join(projectDir, fileName);
  if (!existsSync(filePath)) return;

  const parsed = parseEnvFile(readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (shellEnvKeys.has(key)) continue;
    process.env[key] = value;
  }
}

export function loadE2EProcessEnv(projectDir = process.cwd()) {
  if (hasLoaded) return;
  hasLoaded = true;

  const shellEnvKeys = new Set(Object.keys(process.env));
  loadEnvConfig(projectDir, true, { info: () => undefined, error: () => undefined });

  applyEnvFile(projectDir, ".env.e2e", shellEnvKeys);
  applyEnvFile(projectDir, ".env.e2e.local", shellEnvKeys);
}
