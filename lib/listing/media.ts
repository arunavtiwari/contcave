export interface ListingMediaSource {
    imageSrc?: unknown;
    videoSrc?: unknown;
    addons?: unknown;
    verifications?: unknown;
    sets?: unknown;
}

function addRef(refs: Set<string>, value: unknown) {
    if (typeof value !== "string") return;
    const trimmed = value.trim();
    if (trimmed) refs.add(trimmed);
}

function addRecordRef(refs: Set<string>, value: unknown, key: string) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    addRef(refs, (value as Record<string, unknown>)[key]);
}

function addVerificationRefs(refs: Set<string>, verifications: unknown) {
    if (!verifications || typeof verifications !== "object" || Array.isArray(verifications)) return;
    const record = verifications as Record<string, unknown>;

    if (Array.isArray(record.documents)) {
        record.documents.forEach((document) => {
            addRecordRef(refs, document, "storageRef");
            addRecordRef(refs, document, "url");
            addRecordRef(refs, document, "thumbnail");
        });
    }
    addRecordRef(refs, record.agreementPdf, "storageRef");
    addRecordRef(refs, record.agreementSignature, "url");
}

export function collectListingMediaRefs(source: ListingMediaSource): Set<string> {
    const refs = new Set<string>();

    if (Array.isArray(source.imageSrc)) source.imageSrc.forEach((image) => addRef(refs, image));
    addRef(refs, source.videoSrc);

    if (Array.isArray(source.addons)) {
        source.addons.forEach((addon) => addRecordRef(refs, addon, "imageUrl"));
    }

    if (Array.isArray(source.sets)) {
        source.sets.forEach((set) => {
            if (!set || typeof set !== "object" || Array.isArray(set)) return;
            const images = (set as { images?: unknown }).images;
            if (Array.isArray(images)) images.forEach((image) => addRef(refs, image));
        });
    }

    addVerificationRefs(refs, source.verifications);
    return refs;
}

// Collected across every media field on both sides, so a file moved between
// the main gallery, a set and an add-on is retained rather than deleted.
export function orphanedListingMediaRefs(previous: ListingMediaSource, next: ListingMediaSource): string[] {
    const retained = collectListingMediaRefs(next);
    return Array.from(collectListingMediaRefs(previous)).filter((ref) => !retained.has(ref));
}
