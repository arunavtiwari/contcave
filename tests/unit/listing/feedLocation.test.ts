import { describe, expect, it } from "vitest";

import type { LatLng } from "@/lib/geo";
import { getIpLocation } from "@/lib/http/requestMeta";
import { buildFeedPipeline, type FeedSortContext } from "@/lib/listing/feedQuery";
import { nearestRegion, regionOfPoint } from "@/lib/listing/regions";

const NOIDA: LatLng = [28.5355, 77.391];
const KOLKATA: LatLng = [22.5726, 88.3639];

const bucketLimits = (sort: FeedSortContext) => {
    const project = buildFeedPipeline({ filters: {}, sort }).find((stage) => "$project" in stage)?.$project as {
        bucket: { $switch?: { branches: { case: { $lt?: [string, number] } }[] } };
    };
    return project.bucket.$switch?.branches.flatMap(({ case: test }) => (test.$lt ? [test.$lt[1]] : [])) ?? null;
};

describe("feed location", () => {
    it("places a point inside a served region, else only reports the nearest one", () => {
        expect(regionOfPoint(NOIDA)?.slug).toBe("delhi-ncr");
        expect(nearestRegion(NOIDA)?.slug).toBe("delhi-ncr");
        expect(regionOfPoint(KOLKATA)).toBeNull();
        expect(nearestRegion(KOLKATA)?.slug).toBe("lucknow");
    });

    it("reads Cloudflare's visitor headers behind the proxy and Vercel's otherwise", () => {
        const proxied = new Headers({
            "cf-ray": "a52b-CCU",
            "cf-iplatitude": String(KOLKATA[0]),
            "cf-iplongitude": String(KOLKATA[1]),
            "x-vercel-ip-latitude": "43.2965",
            "x-vercel-ip-longitude": "5.3698",
        });
        expect(getIpLocation(proxied)?.latlng).toEqual(KOLKATA);
        expect(getIpLocation(new Headers({ "cf-ray": "a52b-CCU", "x-vercel-ip-latitude": "43.2965", "x-vercel-ip-longitude": "5.3698" }))).toBeNull();

        const direct = new Headers({ "x-vercel-ip-latitude": String(NOIDA[0]), "x-vercel-ip-longitude": String(NOIDA[1]) });
        expect(getIpLocation(direct)?.latlng).toEqual(NOIDA);
        expect(getIpLocation(new Headers())).toBeNull();
    });

    it("ranks an IP location at city scale and a precise one by area", () => {
        expect(bucketLimits({ region: null, origin: NOIDA })).toEqual([5_000, 15_000, 30_000]);
        expect(bucketLimits({ region: "lucknow", origin: KOLKATA, approximate: true })).toEqual([50_000, 300_000, 1_000_000]);
        expect(bucketLimits({ region: null, origin: null })).toBeNull();
    });
});
