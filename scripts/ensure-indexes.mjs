import { PrismaClient } from "@prisma/client";

const MODES = ["--dry-run", "--execute", "--verify"];
const INDEXES = {
  SearchSession: [
    { name: "SearchSession_expiresAt_ttl", key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    { name: "SearchSession_createdAt_idx", key: { createdAt: 1 } },
  ],
  ListingSearchDoc: [
    { name: "ListingSearchDoc_listingId_key", key: { listingId: 1 }, unique: true },
  ],
};
const NAMESPACE_NOT_FOUND = 26;

const requestedModes = MODES.filter((flag) => process.argv.includes(flag));
if (requestedModes.length > 1) {
  throw new Error("Use only one mode: --dry-run, --execute or --verify");
}
const mode = requestedModes[0] ?? "--dry-run";

const prisma = new PrismaClient();

function databaseLabel() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.host}${url.pathname}`;
  } catch {
    return "unknown (DATABASE_URL is not a valid URL)";
  }
}

async function existingIndexNames(collection) {
  try {
    const result = await prisma.$runCommandRaw({ listIndexes: collection });
    return new Set(result.cursor.firstBatch.map((index) => index.name));
  } catch (error) {
    if (error?.meta?.code === NAMESPACE_NOT_FOUND || /ns does not exist|NamespaceNotFound/i.test(String(error?.message))) {
      return new Set();
    }
    throw error;
  }
}

async function missingIndexes() {
  const missing = [];
  for (const [collection, indexes] of Object.entries(INDEXES)) {
    const existing = await existingIndexNames(collection);
    for (const index of indexes) if (!existing.has(index.name)) missing.push({ collection, index });
  }
  return missing;
}

async function main() {
  console.log(`Database: ${databaseLabel()}`);
  console.log(`Mode: ${mode}`);

  const before = await missingIndexes();
  console.log(`Missing indexes: ${before.length}`);
  for (const { collection, index } of before) console.log(`  ${collection}.${index.name}`);

  if (mode === "--execute") {
    for (const [collection, indexes] of Object.entries(INDEXES)) {
      await prisma.$runCommandRaw({ createIndexes: collection, indexes });
    }
    const after = await missingIndexes();
    console.log(`Missing after execute: ${after.length}`);
    if (after.length > 0) process.exitCode = 1;
  }

  if (mode === "--verify" && before.length > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
