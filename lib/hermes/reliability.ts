/**
 * Incremental reliability update for crew/talent after an executed shoot.
 * A participant counts as on-time unless a LATE/NOSHOW event says otherwise;
 * the brand rating (if given) folds into the running mean.
 */

export type ReliabilitySnapshot = {
    shootsCompleted: number;
    noShows: number;
    avgRating: number;
    onTimePct: number;
};

export type PunctualityEvent = "ONTIME" | "LATE" | "NOSHOW";

export function nextReliability(
    prev: ReliabilitySnapshot,
    event: PunctualityEvent,
    ratingByBrand?: number
): ReliabilitySnapshot {
    const prevCompleted = prev.shootsCompleted;
    const shootsCompleted = prevCompleted + 1;
    const noShows = prev.noShows + (event === "NOSHOW" ? 1 : 0);
    const prevOnTime = (prev.onTimePct / 100) * prevCompleted;
    const onTimePct = ((prevOnTime + (event === "ONTIME" ? 1 : 0)) / shootsCompleted) * 100;
    const avgRating =
        ratingByBrand != null
            ? (prev.avgRating * prevCompleted + ratingByBrand) / shootsCompleted
            : prev.avgRating;

    return {
        shootsCompleted,
        noShows,
        avgRating: Math.round(avgRating * 100) / 100,
        onTimePct: Math.round(onTimePct * 100) / 100,
    };
}
