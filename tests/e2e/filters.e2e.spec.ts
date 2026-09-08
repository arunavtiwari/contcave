import {
  createUserFixture,
  prisma,
} from "./support/db";
import { expect, test } from "./support/test";
import { gotoApp } from "./support/ui";

test.describe("feed filtering staging flow", () => {
  test("filters listings correctly by city location and multi-set options", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    const retrySuffix = `r${testInfo.retry}`;

    // 1. Create a verified owner
    const { user: owner } = await createUserFixture({
      role: "OWNER",
      verified: true,
      suffix: `filter-owner-${retrySuffix}`,
    });

    // 2. Create Listing A: in Delhi (Multi-set: true)
    const titleDelhi = `Delhi Studio CP ${retrySuffix}`;
    const listingDelhi = await prisma.listing.create({
      data: {
        slug: `delhi-studio-cp-${retrySuffix}`.toLowerCase(),
        title: titleDelhi,
        description: "<p>QA Delhi Studio for filtering testing.</p>",
        imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
        category: "Indoor Studio",
        locationValue: "Delhi",
        propertyStateCode: "07",
        actualLocation: {
          latlng: [28.62868, 77.21905],
          label: "Delhi",
          value: "Delhi",
        },
        price: 1500,
        userId: owner.id,
        status: "VERIFIED",
        active: true,
        hasSets: true,
      },
    });

    // Create a set for Listing A to validate hasSets
    await prisma.listingSet.create({
      data: {
        listingId: listingDelhi.id,
        name: "Main Set A",
        description: "Set A",
        images: ["https://assets.contcave.com/e2e/set.png"],
        price: 500,
        position: 0,
      },
    });

    // 3. Create Listing B: in Noida (Multi-set: false)
    const titleNoida = `Noida Studio Sector 62 ${retrySuffix}`;
    const listingNoida = await prisma.listing.create({
      data: {
        slug: `noida-studio-sec62-${retrySuffix}`.toLowerCase(),
        title: titleNoida,
        description: "<p>QA Noida Studio for filtering testing.</p>",
        imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
        category: "Outdoor Location",
        locationValue: "Noida",
        propertyStateCode: "09",
        actualLocation: {
          latlng: [28.62868, 77.21905],
          label: "Noida",
          value: "Noida",
        },
        price: 3500,
        userId: owner.id,
        status: "VERIFIED",
        active: true,
        hasSets: false,
      },
    });

    // 4. Filter by Location: Delhi
    await gotoApp(page, "/home?locationValue=Delhi");
    await expect(page.getByText(titleDelhi)).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(titleNoida)).toBeHidden({ timeout: 15_000 });

    // 5. Filter by Location: Noida
    await gotoApp(page, "/home?locationValue=Noida");
    await expect(page.getByText(titleNoida)).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(titleDelhi)).toBeHidden({ timeout: 15_000 });

    // 6. Filter by Location: Delhi + Multi-set (hasSets=true)
    await gotoApp(page, "/home?locationValue=Delhi&hasSets=true");
    await expect(page.getByText(titleDelhi)).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(titleNoida)).toBeHidden({ timeout: 15_000 });

    // Clean up DB records
    await prisma.listingSet.deleteMany({ where: { listingId: listingDelhi.id } });
    await prisma.listing.deleteMany({ where: { id: { in: [listingDelhi.id, listingNoida.id] } } });
  });
});
