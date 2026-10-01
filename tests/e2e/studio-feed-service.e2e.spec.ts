import crypto from "node:crypto";

import { addDaysToDateKey, buildDayAvailability, checkWindow, isBookable, istDateKey } from "../../lib/booking/dayAvailability";
import type { LatLng } from "../../lib/geo";
import { matchesCategory, STUDIO_CATEGORIES } from "../../lib/listing/categories";
import { resolveListingLocation, toGeoPoint } from "../../lib/listing/location";
import type { StudioFeedFilters } from "../../schemas/listing";
import { createUserFixture, prisma } from "./support/db";
import { readRunState, trackCreated } from "./support/run-state";
import { installServerOnlyStub } from "./support/server-only-stub";
import { expect, test } from "./support/test";

installServerOnlyStub();

type FixtureInput = {
  name: string;
  latlng?: LatLng;
  listingType?: "STANDARD" | "CURATED";
  createdAt: string;
  type?: string[];
  venueTypes?: string[];
  category?: string;
  operationalDays?: { start: string; end: string } | { days: string[] };
  operationalHours?: { start: string; end: string };
  minimumBookingHours?: number;
  setNames?: string[];
};

const ORIGIN: LatLng = [28.6315, 77.2167];

async function getListingService() {
  const module = require("../../lib/listing/service") as typeof import("../../lib/listing/service");
  return module.ListingService;
}

function offsetNorth([lat, lng]: LatLng, km: number): LatLng {
  return [lat + km / 111.32, lng];
}

async function createFeedListing(ownerId: string, city: string, input: FixtureInput) {
  const listing = await prisma.listing.create({
    data: {
      title: `${city} ${input.name}`,
      description: "<p>QA studio feed fixture.</p>",
      imageSrc: ["https://assets.contcave.com/e2e/placeholder-studio.png"],
      category: input.category ?? "Indoor Studio",
      locationValue: city,
      actualLocation: input.latlng ? { latlng: input.latlng, label: city, value: city } : undefined,
      ...(input.latlng ? { locationPoint: toGeoPoint(input.latlng) } : {}),
      price: input.listingType === "CURATED" ? null : 1500,
      listingType: input.listingType ?? "STANDARD",
      userId: ownerId,
      amenities: [],
      otherAmenities: [],
      type: input.type ?? [],
      venueTypes: input.venueTypes ?? [],
      status: "VERIFIED",
      active: true,
      createdAt: new Date(input.createdAt),
      operationalDays: input.operationalDays,
      operationalHours: input.operationalHours ?? { start: "9:00 AM", end: "9:00 PM" },
      minimumBookingHours: input.minimumBookingHours,
      hasSets: Boolean(input.setNames?.length),
      sets: input.setNames?.length
        ? { create: input.setNames.map((name, position) => ({ name, position, price: 1000 })) }
        : undefined,
    },
    include: { sets: true },
  });
  trackCreated("listing", listing.id);
  return listing;
}

async function createReservation(params: { listingId: string; userId: string; date: string; startTime: string; endTime: string; setIds?: string[] }) {
  const reservation = await prisma.reservation.create({
    data: {
      listingId: params.listingId,
      userId: params.userId,
      bookingId: `QA-${crypto.randomUUID()}`,
      startDate: new Date(`${params.date}T00:00:00.000Z`),
      startTime: params.startTime,
      endTime: params.endTime,
      totalPrice: 1500,
      status: "CONFIRMED",
      setIds: params.setIds ?? [],
    },
  });
  trackCreated("reservation", reservation.id);
}

async function pageAll(filters: StudioFeedFilters, origin: LatLng | null, size: number) {
  const ListingService = await getListingService();
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await ListingService.getListingFeedPage({ filters, origin, cursor, size });
    expect(page.origin).toEqual(origin);
    ids.push(...page.items.map((item) => item.id));
    cursor = page.nextCursor;
  } while (cursor);
  return ids;
}

test.describe("studio feed service", () => {
  test("pages nearest-first by cursor without duplicates or gaps", async ({}, testInfo) => {
    const suffix = `feed-geo-r${testInfo.retry}`;
    const city = `${readRunState().runId} Geo ${testInfo.retry}`;
    const { user } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const near = await createFeedListing(user.id, city, { name: "Near", latlng: offsetNorth(ORIGIN, 1), createdAt: "2026-01-01" });
    const mid = await createFeedListing(user.id, city, { name: "Mid", latlng: offsetNorth(ORIGIN, 5), createdAt: "2026-01-02" });
    const midCurated = await createFeedListing(user.id, city, { name: "Mid curated", latlng: offsetNorth(ORIGIN, 5), listingType: "CURATED", createdAt: "2026-01-03" });
    const far = await createFeedListing(user.id, city, { name: "Far", latlng: offsetNorth(ORIGIN, 40), createdAt: "2026-01-04" });
    const unlocated = await createFeedListing(user.id, city, { name: "Unlocated", createdAt: "2026-01-05" });
    const filters = { locationValues: [city] };

    const expected = [near.id, mid.id, midCurated.id, far.id, unlocated.id];
    for (const size of [1, 2, 3, 12]) {
      expect(await pageAll(filters, ORIGIN, size)).toEqual(expected);
    }

    const ListingService = await getListingService();
    const first = await ListingService.getListingFeedPage({ filters, origin: ORIGIN, size: 2 });
    expect(first.nearestKm).toBeGreaterThan(0.9);
    expect(first.nearestKm).toBeLessThan(1.1);

    expect(await pageAll(filters, null, 2)).toEqual([unlocated.id, far.id, mid.id, near.id, midCurated.id]);
  });

  test("keeps its place when studios change mid-scroll", async ({}, testInfo) => {
    const suffix = `feed-stable-r${testInfo.retry}`;
    const city = `${readRunState().runId} Stable ${testInfo.retry}`;
    const { user } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const listings = [];
    for (const km of [1, 2, 3, 4, 5, 6]) {
      listings.push(await createFeedListing(user.id, city, { name: `${km}km`, latlng: offsetNorth(ORIGIN, km), createdAt: `2026-02-0${km}` }));
    }
    const filters = { locationValues: [city] };
    const ListingService = await getListingService();

    const first = await ListingService.getListingFeedPage({ filters, origin: ORIGIN, size: 2 });
    expect(first.items.map((item) => item.id)).toEqual([listings[0].id, listings[1].id]);

    await prisma.listing.update({ where: { id: listings[0].id }, data: { active: false } });
    await createFeedListing(user.id, city, { name: "Inserted closer", latlng: offsetNorth(ORIGIN, 0.5), createdAt: "2026-02-09" });

    const second = await ListingService.getListingFeedPage({ filters, origin: ORIGIN, cursor: first.nextCursor, size: 2 });
    expect(second.items.map((item) => item.id)).toEqual([listings[2].id, listings[3].id]);
  });

  test("category filter matches matchesCategory for every category", async ({}, testInfo) => {
    const suffix = `feed-category-r${testInfo.retry}`;
    const city = `${readRunState().runId} Category ${testInfo.retry}`;
    const { user } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const fixtures: FixtureInput[] = [
      { name: "Legacy podcast", type: ["Podcast Recording"], createdAt: "2026-03-01" },
      { name: "Podcast venue", venueTypes: ["Podcast Studio"], createdAt: "2026-03-02" },
      { name: "Legacy outdoor", category: "Outdoor Studio", createdAt: "2026-03-03" },
      { name: "Venue overrides category", category: "Outdoor Studio", venueTypes: ["Event Space"], createdAt: "2026-03-04" },
      { name: "Cyclorama", category: "Cyclorama Studio", type: ["Brand Campaign Shoot"], createdAt: "2026-03-05" },
      { name: "Reels", type: ["YouTube Videos", "Food & Beverage"], venueTypes: ["Café / Restaurant"], createdAt: "2026-03-06" },
      { name: "Dropped use case", type: ["Meeting"], category: "Co-working Space", createdAt: "2026-03-07" },
    ];
    const created = [];
    for (const fixture of fixtures) created.push(await createFeedListing(user.id, city, fixture));

    for (const category of STUDIO_CATEGORIES) {
      const expected = created.filter((listing) => matchesCategory(listing, category)).map((listing) => listing.id).sort();
      const actual = (await pageAll({ locationValues: [city], studioCategory: category.slug }, null, 2)).sort();
      expect(actual, category.slug).toEqual(expected);
    }
  });

  test("place search keeps only studios within the radius, nearest first", async ({}, testInfo) => {
    const suffix = `feed-radius-r${testInfo.retry}`;
    const city = `${readRunState().runId} Radius ${testInfo.retry}`;
    const { user } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const near = await createFeedListing(user.id, city, { name: "5km", latlng: offsetNorth(ORIGIN, 5), createdAt: "2026-05-01" });
    const edge = await createFeedListing(user.id, city, { name: "14km", latlng: offsetNorth(ORIGIN, 14), createdAt: "2026-05-02" });
    await createFeedListing(user.id, city, { name: "30km", latlng: offsetNorth(ORIGIN, 30), createdAt: "2026-05-03" });
    await createFeedListing(user.id, city, { name: "No location", createdAt: "2026-05-04" });

    expect(await pageAll({ locationValues: [city], near: ORIGIN, radiusKm: 15 }, ORIGIN, 1)).toEqual([near.id, edge.id]);
  });

  test("date filter keeps only studios with a bookable slot that day", async ({}, testInfo) => {
    const suffix = `feed-date-r${testInfo.retry}`;
    const city = `${readRunState().runId} Date ${testInfo.retry}`;
    const { user: owner } = await createUserFixture({ role: "OWNER", verified: true, suffix });
    const { user: customer } = await createUserFixture({ role: "CUSTOMER", suffix });
    const date = addDaysToDateKey(istDateKey(new Date()), 7);
    const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${date}T12:00:00+05:30`).getUTCDay()];

    const open = await createFeedListing(owner.id, city, { name: "Open", createdAt: "2026-04-01" });
    const fullyBooked = await createFeedListing(owner.id, city, { name: "Fully booked", createdAt: "2026-04-02" });
    await createReservation({ listingId: fullyBooked.id, userId: customer.id, date, startTime: "9:00 AM", endTime: "9:00 PM" });
    const oneSetFree = await createFeedListing(owner.id, city, { name: "One set free", createdAt: "2026-04-03", setNames: ["A", "B"] });
    await createReservation({ listingId: oneSetFree.id, userId: customer.id, date, startTime: "9:00 AM", endTime: "9:00 PM", setIds: [oneSetFree.sets[0].id] });
    const closedDay = await createFeedListing(owner.id, city, { name: "Closed day", createdAt: "2026-04-04" });
    await prisma.dayStatus.create({ data: { listingId: closedDay.id, date: new Date(`${date}T00:00:00.000Z`), listingActive: false, startTime: "", endTime: "" } });
    const reopened = await createFeedListing(owner.id, city, {
      name: "Reopened weekday",
      createdAt: "2026-04-05",
      operationalDays: { days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter((day) => day !== weekday) },
    });
    await prisma.dayStatus.create({ data: { listingId: reopened.id, date: new Date(`${date}T00:00:00.000Z`), listingActive: true, startTime: "10:00", endTime: "14:00" } });
    const tooShort = await createFeedListing(owner.id, city, { name: "Window too short", createdAt: "2026-04-06", minimumBookingHours: 2 });
    await createReservation({ listingId: tooShort.id, userId: customer.id, date, startTime: "9:00 AM", endTime: "8:00 PM" });

    const found = await pageAll({ locationValues: [city], date }, null, 2);
    expect(found.sort()).toEqual([open.id, oneSetFree.id, reopened.id].sort());
    expect(await pageAll({ locationValues: [city] }, null, 2)).toHaveLength(6);
  });

  test("availability engine applies the booking rules", () => {
    const now = new Date("2026-10-01T06:00:00Z");
    const listing = { operationalHours: { start: "9:00 AM", end: "9:00 PM" }, minimumBookingHours: 2, hasSets: false, setIds: [] };
    const day = buildDayAvailability({ date: "2026-10-05", listing, bookings: [], blocks: [], now });

    expect(isBookable(day, 1)).toBe(false);
    expect(isBookable(day, 3)).toBe(true);
    expect(checkWindow(day, { start: 600, end: 720, setIds: [], packageMinutes: 180 })).toBe("Selected time slot must match the package duration.");
    expect(checkWindow(day, { start: 480, end: 600, setIds: [] })).toBe("Selected time slot is outside this studio's operational hours.");

    const special = buildDayAvailability({
      date: "2026-10-05",
      listing,
      dayStatus: { listingActive: true, startTime: "06:00", endTime: "08:00" },
      bookings: [],
      blocks: [],
      now,
    });
    expect(checkWindow(special, { start: 360, end: 480, setIds: [] })).toBeNull();

    const today = buildDayAvailability({ date: "2026-10-01", listing, bookings: [], blocks: [], now });
    expect(checkWindow(today, { start: 660, end: 780, setIds: [] })).toBe("Past time slots are not available for booking.");
    expect(checkWindow(today, { start: 720, end: 840, setIds: [] })).toBeNull();
  });

  test("rejects forged cursors", async () => {
    const ListingService = await getListingService();
    const forged = Buffer.from(JSON.stringify({ p: 1, d: 1.5, w: 1, t: "yesterday", id: "nope" })).toString("base64url");
    for (const cursor of ["not-a-cursor", forged]) {
      await expect(ListingService.getListingFeedPage({ filters: {}, origin: null, cursor })).rejects.toThrow("Invalid feed cursor");
    }
  });

  test("resolves listing locations without drifting or inventing coordinates", () => {
    const stored = { latlng: [28.6374, 77.1386], label: "Delhi", state: "Delhi" };

    const relabelled = resolveListingLocation({ ...stored, label: "New Delhi" }, stored);
    expect(relabelled.actualLocation?.latlng).toEqual(stored.latlng);
    expect(relabelled.locationPoint).toEqual({ type: "Point", coordinates: [77.1386, 28.6374] });
    expect(relabelled.propertyStateCode).toBe("07");

    const moved = resolveListingLocation({ latlng: [30.7046, 76.7179], state: "Punjab" }, stored);
    const [lat, lng] = moved.actualLocation?.latlng as LatLng;
    expect(Math.abs(lat - 30.7046)).toBeLessThan(0.02);
    expect(Math.abs(lng - 76.7179)).toBeLessThan(0.02);
    expect([lat, lng]).not.toEqual([30.7046, 76.7179]);
    expect(moved.locationPoint?.coordinates).toEqual([lng, lat]);

    expect(resolveListingLocation({ latlng: [0, 0], label: "x" }, stored).actualLocation?.latlng).toEqual(stored.latlng);
    expect(resolveListingLocation({ latlng: "bad" }).locationPoint).toBeNull();
    expect(resolveListingLocation(null, stored)).toEqual({ actualLocation: null, locationPoint: null });
  });
});
