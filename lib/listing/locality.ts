/**
 * The area a studio is in, for the line under a card's title: "Shahpur Jat, New Delhi".
 *
 * Listings store `actualLocation.display_name`, which is Google's formatted address for the exact
 * premises, so this is a heuristic over free text rather than a lookup. It is deliberately
 * conservative: segments that identify the building (floor, unit, plot, plus code, house number)
 * are dropped, so what's published is the neighbourhood and the city, never the street address.
 * When nothing dependable comes out it returns null and the card falls back to the city.
 */

const PREMISES_WORDS =
    /\b(floor|flr|basement|unit|plot|shop|block|tower|near|opp|opposite|behind|beside|inside|adjoining|off|house|building|complex|society|rd|road|marg|path|street|lane|gali|highway|sco|khasra|pocket|gate|metro|station|no)\b/i;
const PLUS_CODE = /^[A-Z0-9]{4,6}\+[A-Z0-9]{2,}$/i;
const PIN_CODE = /\b\d{6}\b/;
const MOSTLY_DIGITS = /^[\d\s\-/.,#]+$/;
/** House and unit numbers: "B-52", "A-109Q", "172A", "1731a", "D-76". */
const PREMISES_NUMBER = /^[A-Za-z]{0,3}[-\s/]?\d+[-\s/]?[A-Za-z0-9]{0,3}$/;
/** Sector names are areas, not premises, even though they carry a number. */
const SECTOR = /^sector\s/i;

/**
 * States and union territories, matched by name. `actualLocation.state` can't be trusted for
 * this - some listings carry the wrong one, and Delhi and Chandigarh name both a city and a
 * territory - so the tail of the address is identified from the name itself.
 */
const STATES_AND_TERRITORIES = new Set(
    [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
        "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
        "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
        "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
        "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
        "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
        "Lakshadweep", "Puducherry",
    ].map((name) => name.toLowerCase())
);

const normalize = (value: string) => value.trim().toLowerCase();

const stripPin = (segment: string) => segment.replace(PIN_CODE, "").trim();

/** Address segments that name the premises rather than the area. */
function isPremisesSegment(segment: string) {
    if (SECTOR.test(segment)) return false;
    return (
        segment.length < 4 ||
        MOSTLY_DIGITS.test(segment) ||
        PLUS_CODE.test(segment) ||
        PREMISES_NUMBER.test(segment) ||
        PREMISES_WORDS.test(segment)
    );
}

const matchesCity = (segment: string, city: string) => {
    const candidate = normalize(segment);
    const target = normalize(city);
    return candidate === target || candidate.includes(target) || target.includes(candidate);
};

/** The segments of an address that name areas, innermost first, premises and state removed. */
export function localitySegments(displayName: string): string[] {
    const segments = displayName
        .split(",")
        .map(stripPin)
        .filter((segment) => segment && normalize(segment) !== "india")
        .filter((segment) => !STATES_AND_TERRITORIES.has(normalize(segment)))
        .filter((segment) => !isPremisesSegment(segment));

    // Google repeats the city in some addresses ("…, New Delhi, delhi"); keep the outer one only.
    return segments.filter((segment, index) => {
        const next = segments[index + 1];
        return !next || !(matchesCity(segment, next) && matchesCity(next, segment));
    });
}

export function deriveLocality({
    displayName,
    city,
}: {
    displayName: string | null | undefined;
    city: string | null | undefined;
}): string | null {
    if (!displayName || !city) return null;

    const segments = localitySegments(displayName);
    if (segments.length === 0) return null;

    // An exact city match is preferred and containment is the fallback - otherwise "Jaipur Nagar
    // Nigam Area" gets taken for the city and "Jaipur" for the area inside it.
    const target = normalize(city);
    const exact = segments.findLastIndex((segment) => normalize(segment) === target);
    const cityIndex = exact >= 0 ? exact : segments.findLastIndex((segment) => matchesCity(segment, city));

    if (cityIndex < 0) return segments[segments.length - 1] ?? null;
    const area = cityIndex > 0 ? segments[cityIndex - 1] : null;
    return area ? `${area}, ${segments[cityIndex]}` : segments[cityIndex];
}
