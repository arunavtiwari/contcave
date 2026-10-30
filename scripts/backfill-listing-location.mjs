import { PrismaClient } from "@prisma/client";

const MODES = ["--dry-run", "--execute", "--verify"];
const GEO_INDEX = { name: "locationPoint_2dsphere", key: { locationPoint: "2dsphere" } };
const MISSING_POINT = { $or: [{ locationPoint: { $exists: false } }, { locationPoint: null }] };
const BATCH_SIZE = 100;

const requestedModes = MODES.filter((flag) => process.argv.includes(flag));
if (requestedModes.length > 1) {
  throw new Error("Use only one mode: --dry-run, --execute or --verify");
}
const mode = requestedModes[0] ?? "--dry-run";

const prisma = new PrismaClient();

const readNumber = (value) =>
  typeof value === "number" ? value : Number(value?.$numberDouble ?? value?.$numberInt ?? value?.$numberLong);

const readId = (id) => (typeof id === "string" ? id : id?.$oid);

const toLatLng = (value) => {
  if (!Array.isArray(value) || value.length !== 2) return null;
  const [lat, lng] = value.map(readNumber);
  const valid = Number.isFinite(lat) && Number.isFinite(lng)
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    && !(lat === 0 && lng === 0);
  return valid ? [lat, lng] : null;
};

function databaseLabel() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.host}${url.pathname}`;
  } catch {
    return "unknown (DATABASE_URL is not a valid URL)";
  }
}

async function pendingListings() {
  const rows = await prisma.listing.findRaw({
    filter: MISSING_POINT,
    options: { projection: { _id: 1, "actualLocation.latlng": 1 } },
  });
  return rows.map((row) => ({ id: readId(row._id), latlng: toLatLng(row.actualLocation?.latlng) }));
}

async function hasGeoIndex() {
  const result = await prisma.$runCommandRaw({ listIndexes: "Listing" });
  return result.cursor.firstBatch.some((index) => index.name === GEO_INDEX.name);
}

async function backfill(listings) {
  let modified = 0;
  for (let start = 0; start < listings.length; start += BATCH_SIZE) {
    const batch = listings.slice(start, start + BATCH_SIZE);
    const result = await prisma.$runCommandRaw({
      update: "Listing",
      ordered: false,
      updates: batch.map(({ id, latlng: [lat, lng] }) => ({
        q: { $and: [{ _id: { $oid: id } }, MISSING_POINT] },
        u: { $set: { locationPoint: { type: "Point", coordinates: [lng, lat] } } },
      })),
    });
    if (Array.isArray(result.writeErrors) && result.writeErrors.length > 0) {
      throw new Error(`Batch starting at ${start} failed: ${JSON.stringify(result.writeErrors)}`);
    }
    modified += Number(result.nModified ?? 0);
  }
  return modified;
}

async function report() {
  const pending = await pendingListings();
  const locatable = pending.filter((listing) => listing.latlng);
  const unlocatable = pending.filter((listing) => !listing.latlng).map((listing) => listing.id);
  return { geoIndex: await hasGeoIndex(), locatable, unlocatable };
}

async function main() {
  console.log(`Database: ${databaseLabel()}`);
  console.log(`Mode: ${mode}`);

  const before = await report();
  console.log(`2dsphere index present: ${before.geoIndex}`);
  console.log(`Listings missing locationPoint with valid coordinates: ${before.locatable.length}`);
  console.log(`Listings without usable coordinates (left unchanged): ${before.unlocatable.length}`);
  if (before.unlocatable.length > 0) console.log(`  ${before.unlocatable.join(", ")}`);

  if (mode === "--execute") {
    await prisma.$runCommandRaw({ createIndexes: "Listing", indexes: [GEO_INDEX] });
    const modified = await backfill(before.locatable);
    const after = await report();
    console.log(`Updated: ${modified}`);
    console.log(`Remaining with valid coordinates: ${after.locatable.length}`);
    if (!after.geoIndex || after.locatable.length > 0) process.exitCode = 1;
  }

  if (mode === "--verify" && (!before.geoIndex || before.locatable.length > 0)) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
