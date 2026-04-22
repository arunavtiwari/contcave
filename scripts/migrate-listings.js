const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrate() {
  console.log("🚀 Starting Listing fields migration (String -> Int)...");

  // Fetch all listings
  const listings = await prisma.listing.findMany({
    select: {
      id: true,
      carpetArea: true,
      minimumBookingHours: true,
      maximumPax: true,
    }
  });

  console.log(`📊 Found ${listings.length} listings to process.`);

  let count = 0;
  for (const listing of listings) {
    const updates = {};

    // Helper to convert string to int, extracting only digits
    const toInt = (val) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        const parsed = parseInt(val.replace(/\D/g, ""), 10);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    // We check if they are strings. If they are already numbers (after conversion), we skip.
    if (typeof listing.carpetArea === 'string' || listing.carpetArea === null) {
      updates.carpetArea = toInt(listing.carpetArea);
    }

    if (typeof listing.minimumBookingHours === 'string' || listing.minimumBookingHours === null) {
      updates.minimumBookingHours = toInt(listing.minimumBookingHours);
    }

    if (typeof listing.maximumPax === 'string' || listing.maximumPax === null) {
      updates.maximumPax = toInt(listing.maximumPax);
    }

    if (Object.keys(updates).length > 0) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: updates
      });
      console.log(`✅ Migrated listing ${listing.id}: ${JSON.stringify(updates)}`);
      count++;
    }
  }

  console.log(`\n✨ Migration complete. Total records updated: ${count}`);
}

migrate()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
