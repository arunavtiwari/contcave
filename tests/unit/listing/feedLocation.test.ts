import { describe, expect, it } from "vitest";

import type { LatLng } from "@/lib/geo";
import { getIpLocation } from "@/lib/http/requestMeta";
import { nearestRegion, regionOfPoint } from "@/lib/listing/regions";

const NOIDA: LatLng = [28.5355, 77.391];
const KOLKATA: LatLng = [22.5726, 88.3639];

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
});
