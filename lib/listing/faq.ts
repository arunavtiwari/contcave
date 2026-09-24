import { GST_RATE } from "@/constants/gst";
import { amenityNamesOf, cityOf, minimumBookingHours, positive, stateOf } from "@/lib/listing/seo";
import { toHHMM } from "@/lib/scheduling";
import type { FaqItem } from "@/lib/seo";
import type { SafeAmenity } from "@/types/amenity";
import type { FullListing } from "@/types/listing";
import { buildOperationalTimings } from "@/types/scheduling";

const INR = new Intl.NumberFormat("en-IN");
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const joinList = (items: string[]) =>
  items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

export const durationText = (hours: number) =>
  Number.isInteger(hours) ? `${hours} hour${hours === 1 ? "" : "s"}` : `${Math.round(hours * 60)} minutes`;

const peopleText = (count: number) => (count === 1 ? "1 person" : `${count} people`);

function openDaysText(openDays: number[]) {
  if (openDays.length === 7) return "every day";
  const ordered = WEEK_ORDER.filter((day) => openDays.includes(day));
  const positions = ordered.map((day) => WEEK_ORDER.indexOf(day));
  const consecutive = positions.every((position, i) => i === 0 || position === positions[i - 1] + 1);
  return consecutive && ordered.length > 2
    ? `${DAY_NAMES[ordered[0]]} to ${DAY_NAMES[ordered[ordered.length - 1]]}`
    : joinList(ordered.map((day) => DAY_NAMES[day]));
}

export function openingHoursText(listing: FullListing) {
  const { byDay } = buildOperationalTimings(listing);
  const openDays = (byDay ?? []).flatMap((day, index) => (day.enabled ? [index] : []));
  const start = listing.operationalHours?.start?.trim();
  const end = listing.operationalHours?.end?.trim();
  if (!openDays.length || !start || !end) return undefined;

  const days = openDaysText(openDays);
  const closesAtMidnight = toHHMM(end) === "00:00" || toHHMM(end) === "23:59";
  return toHHMM(start) === "00:00" && closesAtMidnight
    ? `open 24 hours, ${days}`
    : `open ${days}, ${start} to ${end}`;
}

function priceAnswer(listing: FullListing, name: string) {
  if (listing.listingType === "CURATED") {
    const min = positive(listing.priceRangeMin);
    const max = positive(listing.priceRangeMax);
    return min && max
      ? `ContCave estimates ₹${INR.format(min)}–₹${INR.format(max)} per hour for ${name}. Message ContCave on WhatsApp to confirm the rate for your shoot.`
      : `${name} is priced on request. Message ContCave on WhatsApp for a quote for your shoot.`;
  }

  const price = positive(listing.price);
  if (!price) return undefined;

  const answer = [
    `${name} costs ₹${INR.format(price)} per hour, plus ${Math.round(GST_RATE * 100)}% GST.`,
    `The minimum booking is ${durationText(minimumBookingHours(listing))}.`,
  ];
  const packages = (listing.packages ?? []).filter((pkg) => positive(pkg.offeredPrice));
  if (packages.length) {
    const cheapest = packages.reduce((low, pkg) => (pkg.offeredPrice < low.offeredPrice ? pkg : low));
    answer.push(`Packages start at ₹${INR.format(cheapest.offeredPrice)} for ${durationText(cheapest.durationHours)}.`);
  }
  if (listing.hasSets && (listing.sets?.length ?? 0) > 1) {
    answer.push("Booking more than one set costs extra; the total for your selection is shown before you pay.");
  }
  return answer.join(" ");
}

function bookingAnswer(listing: FullListing, name: string): FaqItem {
  if (listing.listingType === "CURATED") {
    return {
      question: "How do I book this studio?",
      answer: `Message ContCave on WhatsApp from this page; the team checks availability and pricing with ${name} for you.`,
    };
  }
  return {
    question: "Can I book this studio instantly?",
    answer: listing.instantBooking
      ? `Yes. ${name} has instant booking, so your booking is confirmed as soon as your payment goes through.`
      : `${name} takes booking requests. You pay when you send the request and the host has 24 hours to accept; if they decline or don't reply, your payment is refunded.`,
  };
}

export function buildListingFaq(listing: FullListing, amenities: SafeAmenity[]): FaqItem[] {
  const name = listing.title.trim();
  const faq: FaqItem[] = [];
  const add = (question: string, answer: string | undefined) => {
    if (answer) faq.push({ question, answer });
  };

  add("How much does it cost to book this studio?", priceAnswer(listing, name));
  faq.push(bookingAnswer(listing, name));

  const pax = positive(listing.maximumPax);
  add("How many people can the studio hold?", pax ? `${name} fits up to ${peopleText(pax)}.` : undefined);

  const area = positive(listing.carpetArea);
  add("How big is the studio?", area ? `${name} is ${INR.format(area)} sq ft.` : undefined);

  const sets = listing.hasSets ? (listing.sets ?? []) : [];
  add(
    "What sets does the studio have?",
    sets.length > 0
      ? `${name} has ${sets.length === 1 ? "1 set" : `${sets.length} sets`}: ${joinList(sets.map((set) => set.name))}.` +
      (sets.length > 1 ? " You can book a single set or the whole studio." : "")
      : undefined
  );

  const amenityNames = amenityNamesOf(listing, amenities);
  add("What amenities does the studio have?", amenityNames.length ? `${name} has ${joinList(amenityNames)}.` : undefined);

  const hours = openingHoursText(listing);
  add("When is the studio open?", hours && `${name} is ${hours}.`);

  const uses = (listing.type ?? []).filter(Boolean);
  add("What kind of shoots is the studio listed for?", uses.length ? `${name} is listed for ${joinList(uses)}.` : undefined);

  const city = cityOf(listing);
  const state = stateOf(listing);
  add(
    "Where is the studio?",
    city &&
    `${name} is in ${city}${state && state !== city ? `, ${state}` : ""}.` +
    (listing.listingType === "CURATED" ? "" : " The exact address and a map link come with your booking confirmation.")
  );

  return faq;
}
