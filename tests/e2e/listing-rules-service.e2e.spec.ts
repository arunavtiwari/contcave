import { SETS_REQUIRE_PACKAGE_MESSAGE } from "../../schemas/listing";
import { createActiveListingFixture, createUserFixture, prisma } from "./support/db";
import { installServerOnlyStub } from "./support/server-only-stub";
import { expect, test } from "./support/test";

installServerOnlyStub();

const MAIN_SET = { name: "Main Set", images: [], price: 500 };
const FULL_STUDIO_PACKAGE = {
  title: "Full Studio",
  originalPrice: 6000,
  offeredPrice: 5000,
  features: ["All sets"],
  durationHours: 4,
};

async function getListingService() {
  const module = require("../../lib/listing/service") as typeof import("../../lib/listing/service");
  return module.ListingService;
}

test.describe("listing rules service", () => {
  test("studios with sets must keep at least one package", async ({}, testInfo) => {
    const suffix = `sets-package-r${testInfo.retry}`;
    const { user } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const listing = await createActiveListingFixture(user.id, suffix);
    const ListingService = await getListingService();

    await expect(
      ListingService.updateListing(user.id, listing.id, { hasSets: true, sets: [MAIN_SET] })
    ).rejects.toThrow(SETS_REQUIRE_PACKAGE_MESSAGE);

    await ListingService.updateListing(user.id, listing.id, {
      hasSets: true,
      sets: [MAIN_SET],
      packages: [FULL_STUDIO_PACKAGE],
    });
    const withSets = await prisma.listing.findUniqueOrThrow({
      where: { id: listing.id },
      select: { hasSets: true, packages: { select: { isActive: true } } },
    });
    expect(withSets.hasSets).toBe(true);
    expect(withSets.packages.filter((pkg) => pkg.isActive)).toHaveLength(1);

    await expect(
      ListingService.updateListing(user.id, listing.id, { packages: [] })
    ).rejects.toThrow(SETS_REQUIRE_PACKAGE_MESSAGE);

    await ListingService.updateListing(user.id, listing.id, { description: "<p>Unrelated edits still save for studios with sets.</p>" });
  });

  test("only ContCave can set the note shown in the booking summary", async ({}, testInfo) => {
    const suffix = `contcave-note-r${testInfo.retry}`;
    const { user } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const listing = await createActiveListingFixture(user.id, suffix);
    const ListingService = await getListingService();
    const noteOf = async () =>
      (await prisma.listing.findUniqueOrThrow({ where: { id: listing.id }, select: { contcaveNote: true } })).contcaveNote;

    await expect(
      ListingService.updateListing(user.id, listing.id, { contcaveNote: "Owner-written note" })
    ).rejects.toThrow(/only contcave/i);
    expect(await noteOf()).toBeNull();

    await ListingService.updateListing(user.id, listing.id, { contcaveNote: "  Use the basement parking.\nArrive 15 minutes early.  " }, true);
    expect(await noteOf()).toBe("Use the basement parking.\nArrive 15 minutes early.");

    await ListingService.updateListing(user.id, listing.id, { contcaveNote: "   " }, true);
    expect(await noteOf()).toBeNull();
  });
});
