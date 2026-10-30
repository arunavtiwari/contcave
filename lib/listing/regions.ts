import { distanceKm, type LatLng } from "@/lib/geo";

/**
 * Metro regions we serve. Nearby cities share a region so they aren't treated as "another city"
 * when sorting (a Noida studio is local for someone in Delhi).
 *
 * `cities` are matched case-insensitively against Listing.locationValue and the visitor's IP city.
 * `center` and `radiusKm` decide which region a GPS or typed location falls in.
 */
export type Region = {
    slug: string;
    name: string;
    cities: string[];
    center: LatLng;
    radiusKm: number;
};

export const REGIONS: Region[] = [
    {
        slug: "delhi-ncr",
        name: "Delhi NCR",
        cities: ["Delhi", "New Delhi", "Noida", "Greater Noida", "Gurgaon", "Gurugram", "Ghaziabad", "Faridabad"],
        center: [28.6139, 77.209],
        radiusKm: 60,
    },
    {
        slug: "mumbai-mmr",
        name: "Mumbai MMR",
        cities: ["Mumbai", "Navi Mumbai", "Thane"],
        center: [19.076, 72.8777],
        radiusKm: 50,
    },
    {
        slug: "chandigarh-tricity",
        name: "Chandigarh Tricity",
        cities: ["Chandigarh", "Mohali", "Panchkula", "Zirakpur"],
        center: [30.7333, 76.7794],
        radiusKm: 30,
    },
    { slug: "lucknow", name: "Lucknow", cities: ["Lucknow"], center: [26.8467, 80.9462], radiusKm: 35 },
    { slug: "jaipur", name: "Jaipur", cities: ["Jaipur"], center: [26.9124, 75.7873], radiusKm: 35 },
    { slug: "bengaluru", name: "Bengaluru", cities: ["Bengaluru", "Bangalore"], center: [12.9716, 77.5946], radiusKm: 45 },
    { slug: "indore", name: "Indore", cities: ["Indore"], center: [22.7196, 75.8577], radiusKm: 30 },
    { slug: "meerut", name: "Meerut", cities: ["Meerut"], center: [28.9845, 77.7064], radiusKm: 25 },
];

const normalize = (value: string) => value.trim().toLowerCase();

export const findRegion = (slug: string | null | undefined) => REGIONS.find((region) => region.slug === slug) ?? null;

const regionsByDistance = (latlng: LatLng) =>
    REGIONS.map((region) => ({ region, km: distanceKm(latlng, region.center) })).sort((a, b) => a.km - b.km);

/** Region a point falls in (nearest centre within that region's radius), or null. */
export const regionOfPoint = (latlng: LatLng): Region | null =>
    regionsByDistance(latlng).find(({ region, km }) => km <= region.radiusKm)?.region ?? null;

export const nearestRegion = (latlng: LatLng): Region | null => regionsByDistance(latlng)[0]?.region ?? null;

/** Lower-cased city names per region, for matching Listing.locationValue in the feed query. */
export const regionCityKeys = (region: Region) => region.cities.map(normalize);
