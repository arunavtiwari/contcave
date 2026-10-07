import { INDIAN_CITIES } from "@/hooks/useCities";
import { LOCALITIES } from "@/lib/search/localities";

type TermCategory = "shootTypes" | "needs" | "vibes" | "venueTypes";

type Dictionary = Record<string, string[]>;

const SHOOT_TYPE_TERMS: Dictionary = {
    "Product & E-commerce": ["product", "products", "ecommerce", "e commerce", "catalog", "catalogue", "packshot", "pack shot", "skincare", "skin care", "cosmetics", "beauty product", "jewellery", "jewelry", "flat lay", "flatlay", "amazon listing", "myntra"],
    "Fashion & Lifestyle": ["fashion", "lookbook", "look book", "apparel", "clothing", "garment", "saree", "sari", "ethnic wear", "kurta", "lifestyle", "model shoot", "collection launch"],
    "Food & Beverage": ["food", "beverage", "beverages", "drinks", "menu shoot", "recipe", "cooking", "dish", "dishes"],
    "Portrait & Editorial": ["portrait", "portraits", "headshot", "headshots", "editorial", "profile photo", "linkedin photo", "maternity", "newborn", "family photo", "family shoot"],
    "Pre-Wedding": ["pre wedding", "prewedding", "couple shoot", "engagement shoot", "save the date"],
    "Video & Film": ["video", "film", "ad film", "commercial", "tvc", "music video", "short film", "brand film", "corporate video", "documentary"],
    "Podcast & Interview": ["podcast", "podcasts", "vodcast", "interview", "talk show", "panel discussion", "podcast studio", "podcast setup", "podcast set"],
    "UGC & Reels": ["reel", "reels", "ugc", "instagram", "insta", "youtube", "youtuber", "vlog", "shorts", "influencer", "content creation", "content creator", "creator"],
    "Events & Pop-Ups": ["event", "events", "party", "pop up", "popup", "workshop", "launch event", "exhibition", "meetup", "birthday", "screening"],
    "Music Recording": ["music recording", "song recording", "audio recording", "dubbing", "voiceover", "voice over", "jingle", "jam session", "rehearsal", "recording studio", "music studio"],
};

const NEED_TERMS: Dictionary = {
    Cyclorama: ["cyclorama", "cyc", "cyc wall", "infinity wall", "infinity cove", "cove"],
    "Infinity White Cyc": ["white cyc", "white cyclorama", "white infinity", "white infinity wall", "infinity white"],
    "Green Screen": ["green screen", "greenscreen", "chroma", "chroma key", "green cyc"],
    "Natural Light": ["natural light", "daylight", "day light", "sunlight", "window light", "sunlit", "natural lighting"],
    "Blackout / Controllable": ["blackout", "black out", "controlled light", "controllable light", "light controlled", "dark room"],
    Skylight: ["skylight", "sky light"],
    "Paper Backdrops": ["paper backdrop", "paper backdrops", "seamless paper", "backdrop paper", "paper roll", "paper rolls"],
    "Coloured Backdrops": ["coloured backdrop", "colored backdrop", "colour backdrop", "color backdrop", "coloured backdrops", "colored backdrops"],
    "Printed Backdrops": ["printed backdrop", "printed backdrops", "textured backdrop"],
    "High Ceilings": ["high ceiling", "high ceilings", "double height", "tall ceiling"],
    "Exposed Brick": ["exposed brick", "brick wall", "brick walls"],
    "White Walls": ["white wall", "white walls"],
    "Wooden Panels": ["wooden panel", "wooden panels", "wood panel", "wood panels", "wooden wall"],
    "Hardwood Floor": ["wooden floor", "wood floor", "hardwood", "hardwood floor"],
    "Concrete Floor": ["concrete floor", "cement floor"],
    "Open Floor Plan": ["open floor", "open space", "open plan", "big space", "large space", "spacious"],
    "Raw Space": ["raw space", "unfurnished", "empty space", "bare space"],
    "Air Conditioned": ["ac", "a c", "air conditioned", "air conditioning", "air conditioner", "aircon"],
    Restroom: ["washroom", "restroom", "toilet", "bathroom"],
    "Changing Room": ["changing room", "change room", "trial room", "green room"],
    "Makeup Vanity": ["makeup room", "make up room", "makeup vanity", "vanity", "mua", "hmu", "makeup area", "makeup station"],
    "Lounge Area": ["lounge", "waiting area", "client lounge"],
    "Kitchen / Pantry": ["kitchen", "pantry"],
    Parking: ["parking", "car park"],
    "Freight Lift": ["lift", "elevator", "freight lift", "goods lift"],
    "Drive-In Access": ["drive in", "car access"],
    "Wi-Fi": ["wifi", "wi fi", "internet"],
    "24/7 Access": ["24/7", "24x7", "24 hours", "overnight", "night shoot", "all night"],
    Soundproofed: ["soundproof", "soundproofed", "sound proof", "acoustic", "acoustically treated", "acoustic treatment"],
    "Wheelchair Accessible": ["wheelchair", "wheelchair accessible"],
    "Pet Friendly": ["pet", "pets", "pet friendly", "dog", "dogs", "cat", "cats"],
};

const VIBE_TERMS: Dictionary = {
    Industrial: ["industrial", "warehouse", "loft"],
    "Indian Traditional": ["traditional", "ethnic", "haveli", "desi", "heritage", "rajasthani", "indian traditional"],
    "Minimalist & White": ["minimal", "minimalist", "minimalistic", "clean look", "all white", "scandinavian", "scandi"],
    Boho: ["boho", "bohemian"],
    "Vibrant & Bold": ["vibrant", "bold", "colourful", "colorful", "bright colours", "bright colors"],
    "Warm & Earthy": ["warm", "earthy", "terracotta", "cozy", "cosy"],
    "Luxury & Opulent": ["luxury", "luxurious", "opulent", "premium", "royal", "lavish"],
    Rustic: ["rustic", "farmhouse"],
    "Modern & Contemporary": ["modern", "contemporary", "sleek"],
    "Vintage & Retro": ["vintage", "retro", "old school", "antique"],
    Pastel: ["pastel", "pastels", "soft colours", "soft colors"],
    "Dark & Moody": ["dark", "moody", "low key", "dramatic"],
    "Natural & Greenery": ["greenery", "plants", "garden", "green", "nature", "lush"],
    "Editorial & Architectural": ["architectural", "geometric", "arches"],
};

const VENUE_TYPE_TERMS: Dictionary = {
    "Shoot Studio": ["photo studio", "photography studio", "shoot studio", "photoshoot studio"],
    "Home-Style Set": ["home set", "home style", "homestyle", "house", "apartment", "living room", "bedroom", "home like"],
    "Café / Restaurant": ["cafe", "café", "restaurant", "coffee shop", "bar"],
    "Event Space": ["event space", "hall", "banquet", "event venue"],
    "Co-working": ["coworking", "co working", "office", "meeting room", "conference room"],
    "Recording Studio": ["recording studio", "sound studio", "music studio"],
    "Podcast Studio": ["podcast studio", "podcast setup", "podcast set"],
    "Outdoor / Rooftop": ["outdoor", "outdoors", "rooftop", "roof top", "terrace", "open air", "lawn"],
};

const NEED_EQUIVALENTS: Record<string, string[]> = {
    Cyclorama: ["Cyclorama", "Infinity White Cyc"],
    "Infinity White Cyc": ["Infinity White Cyc", "Cyclorama"],
};

export const SHOOT_TYPE_VENUES: Record<string, string[]> = {
    "Podcast & Interview": ["Podcast Studio", "Recording Studio"],
    "Music Recording": ["Recording Studio", "Podcast Studio"],
    "Food & Beverage": ["Café / Restaurant", "Home-Style Set", "Shoot Studio"],
    "Events & Pop-Ups": ["Event Space", "Outdoor / Rooftop", "Café / Restaurant", "Co-working"],
};

const CITY_GROUPS: Record<string, string[]> = {
    "Delhi NCR": ["Delhi", "Noida", "Gurugram", "Faridabad"],
    Tricity: ["Chandigarh", "Mohali"],
};

const CITY_ALIASES: Record<string, string> = {
    lko: "Lucknow",
    lucknow: "Lucknow",
    "new delhi": "Delhi",
    dilli: "Delhi",
    ncr: "Delhi NCR",
    "delhi ncr": "Delhi NCR",
    gurgaon: "Gurugram",
    ggn: "Gurugram",
    "greater noida": "Noida",
    bangalore: "Bengaluru",
    blr: "Bengaluru",
    bombay: "Mumbai",
    calcutta: "Kolkata",
    madras: "Chennai",
    prayagraj: "Allahabad",
    visakhapatnam: "Vizag",
    thiruvananthapuram: "Trivandrum",
    mysuru: "Mysore",
    mangaluru: "Mangalore",
    chd: "Chandigarh",
    tricity: "Tricity",
};

export function normalizeText(text: string) {
    return ` ${text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[‐-―−]/g, "-")
        .replace(/(?<=\d),(?=\d)/g, "")
        .replace(/[^a-z0-9₹./:\-\s]/g, " ")
        .replace(/(?<=[a-z])[./-](?=[a-z])/g, " ")
        .replace(/\s+/g, " ")
        .trim()} `;
}

type PhraseCategory = TermCategory | "cities" | "areas";

type Phrase = { phrase: string; category: PhraseCategory; label: string };

const phrasesOf = (dictionary: Dictionary, category: PhraseCategory): Phrase[] =>
    Object.entries(dictionary).flatMap(([label, terms]) =>
        [label, ...terms].map((term) => ({ phrase: normalizeText(term).trim(), category, label })));

const CITY_DICTIONARY: Dictionary = {
    ...Object.fromEntries(INDIAN_CITIES.map((city) => [city.name, []])),
    ...Object.fromEntries(Object.keys(CITY_GROUPS).map((group) => [group, []])),
    ...Object.entries(CITY_ALIASES).reduce<Dictionary>((acc, [alias, city]) => ({ ...acc, [city]: [...(acc[city] ?? []), alias] }), {}),
};

const AREA_DICTIONARY: Dictionary = Object.fromEntries(LOCALITIES.map((locality) => [locality.name, locality.aliases ?? []]));

const PHRASES: [string, Phrase[]][] = Object.entries(
    [
        ...phrasesOf(AREA_DICTIONARY, "areas"),
        ...phrasesOf(CITY_DICTIONARY, "cities"),
        ...phrasesOf(SHOOT_TYPE_TERMS, "shootTypes"),
        ...phrasesOf(NEED_TERMS, "needs"),
        ...phrasesOf(VIBE_TERMS, "vibes"),
        ...phrasesOf(VENUE_TYPE_TERMS, "venueTypes"),
    ]
        .filter((entry) => entry.phrase.length > 1)
        .reduce<Record<string, Phrase[]>>((groups, entry) => ({ ...groups, [entry.phrase]: [...(groups[entry.phrase] ?? []), entry] }), {}),
).sort(([a], [b]) => b.length - a.length);

export type ExtractedTerms = Record<PhraseCategory, string[]> & { rest: string };

export function extractTerms(text: string): ExtractedTerms {
    let masked = normalizeText(text);
    const found: ExtractedTerms = { shootTypes: [], needs: [], vibes: [], venueTypes: [], cities: [], areas: [], rest: "" };

    for (const [phrase, entries] of PHRASES) {
        const needle = ` ${phrase} `;
        if (!masked.includes(needle)) continue;
        masked = masked.split(needle).join(" | ");
        for (const entry of entries) {
            if (!found[entry.category].includes(entry.label)) found[entry.category].push(entry.label);
        }
    }

    found.rest = masked;
    return found;
}

export function expandCities(name: string): string[] {
    return CITY_GROUPS[name] ?? [name];
}

export function resolveCityName(value: string): string | null {
    const [city] = extractTerms(value).cities;
    return city ?? null;
}

export const needSatisfiedBy = (need: string, available: Set<string>) =>
    (NEED_EQUIVALENTS[need] ?? [need]).some((label) => available.has(label));
