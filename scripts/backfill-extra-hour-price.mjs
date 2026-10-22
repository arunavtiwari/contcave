import { PrismaClient } from "@prisma/client";

// Every bookable listing needs an extra hour rate. Listings created before the field existed get
// their base hourly price as a starting value; owners can change it from Edit Listing.
// Listings that already have a rate, and curated (enquiry-only) listings, are left alone.
const MODES = ["--dry-run", "--execute"];
const requestedModes = MODES.filter((flag) => process.argv.includes(flag));
if (requestedModes.length > 1) throw new Error("Use only one mode: --dry-run or --execute");
const mode = requestedModes[0] ?? "--dry-run";

const prisma = new PrismaClient();

const MISSING_RATE = {
  $and: [
    { $or: [{ extraHourPrice: { $exists: false } }, { extraHourPrice: null }] },
    { price: { $gt: 0 } },
    { listingType: { $ne: "CURATED" } },
  ],
};

function databaseLabel() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.host}${url.pathname}`;
  } catch {
    return "unknown (DATABASE_URL is not a valid URL)";
  }
}

async function main() {
  console.log(`Database: ${databaseLabel()}`);
  console.log(`Mode: ${mode}`);

  const pending = await prisma.listing.findRaw({
    filter: MISSING_RATE,
    options: { projection: { _id: 1, title: 1, price: 1 } },
  });
  console.log(`Listings without an extra hour rate: ${pending.length}`);
  for (const listing of pending) console.log(`  - ${listing.title} → ₹${listing.price?.$numberInt ?? listing.price}`);

  if (mode === "--dry-run") {
    console.log("Re-run with --execute to copy each listing's price into extraHourPrice.");
    return;
  }

  const result = await prisma.$runCommandRaw({
    update: "Listing",
    updates: [{ q: MISSING_RATE, u: [{ $set: { extraHourPrice: "$price" } }], multi: true }],
  });
  console.log(`Updated: ${result.nModified}`);

  const remaining = await prisma.listing.findRaw({ filter: MISSING_RATE, options: { projection: { _id: 1 } } });
  console.log(`Still missing: ${remaining.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
