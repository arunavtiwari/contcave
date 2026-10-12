import getListings from "@/app/actions/getListings";
import { CANCELLATION_POLICY_SUMMARY } from "@/constants/cancellation";
import { getPlaceDirectory } from "@/lib/listing/cities";
import { cityPath } from "@/lib/listing/cityPaths";
import { listingFacts, listingPath } from "@/lib/listing/seo";
import { getSortedPostsData } from "@/lib/posts";
import { absoluteUrl, BRAND_DESCRIPTION, FOUNDERS } from "@/lib/seo";
import { pluralize } from "@/lib/strings";
import { formatINR } from "@/lib/utils";

export const revalidate = 3600;

const MAX_LISTINGS = 500;

const logError = (part: string, error: unknown) =>
  console.error(`[llms.txt] Error loading ${part}:`, error instanceof Error ? error.message : "Unknown error");

const link = (title: string, path: string, note?: string) =>
  `- [${title.replace(/[[\]]/g, "")}](${absoluteUrl(path)})${note ? `: ${note}` : ""}`;

export async function GET() {
  const [cities, listings] = await Promise.all([
    getPlaceDirectory().catch((error: unknown) => {
      logError("cities", error);
      return [];
    }),
    getListings({}).catch((error: unknown) => {
      logError("listings", error);
      return [];
    }),
  ]);

  let posts: ReturnType<typeof getSortedPostsData> = [];
  try {
    posts = getSortedPostsData();
  } catch (error) {
    logError("blog posts", error);
  }

  const lines = [
    "# ContCave",
    "",
    `> ${BRAND_DESCRIPTION}`,
    "",
    "ContCave is an Indian marketplace for booking photography, video, podcast and event studios by the hour. " +
    "Each listing is reviewed by the ContCave team before it is published. Guests book and pay online; curated " +
    "studios are booked through ContCave on WhatsApp. Hourly prices are shown before GST. ContCave is run by " +
    "Arkanet Ventures LLP.",
    "",
    "## Founders",
    "",
    ...FOUNDERS.map(({ name, jobTitle, sameAs }) => `- [${name}](${sameAs}): Co-founder and ${jobTitle}`),
  ];

  if (cities.length) {
    lines.push("", "## Studios by city", "");
    lines.push(link("All cities", "/studios", "every city with bookable studios"));
    for (const city of cities) {
      const price = city.fromPrice ? `, from ${formatINR(city.fromPrice)}/hr` : "";
      lines.push(link(`Studios in ${city.city}`, cityPath(city.city), `${pluralize(city.count, "studio")}${price}`));
    }
  }

  if (listings.length) {
    lines.push("", "## Studios", "");
    for (const listing of listings.slice(0, MAX_LISTINGS)) {
      lines.push(link(listing.title.trim(), listingPath(listing), listingFacts(listing)));
    }
  }

  if (posts.length) {
    lines.push("", "## Guides", "");
    for (const post of posts) lines.push(link(post.title, `/blog/${post.id}`, post.meta?.description));
  }

  lines.push(
    "",
    "## Booking and policies",
    "",
    link("Cancellation policy", "/cancellation", CANCELLATION_POLICY_SUMMARY),
    link("Terms and conditions", "/terms-and-conditions"),
    link("Privacy policy", "/privacy-policy"),
    "",
    "## Optional",
    "",
    link("About ContCave", "/about"),
    link("Browse all studios", "/studios"),
    "- Contact: info@contcave.com",
    ""
  );

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
